"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

interface ComponentsPreviewProps {
  content?: string;
  isStreaming?: boolean;
}

const FALLBACK_MESSAGE =
  "// Waiting for the Components Specialist to generate code…\n";

const extractPrimaryCodeBlock = (content: string) => {
  if (!content) {
    return { code: "", language: "" };
  }

  const fenceMatch =
    /```([\w-]+)?[^\n]*\n([\s\S]*?)```/m.exec(content) ??
    /~~~([\w-]+)?[^\n]*\n([\s\S]*?)~~~/m.exec(content);
  if (fenceMatch) {
    const language = fenceMatch[1]?.trim().toLowerCase() ?? "";
    const code = fenceMatch[2]?.trim() ?? "";
    return { code, language };
  }

  return { code: content.trim(), language: "" };
};

const isProbablyTypeScript = (source: string, languageHint: string) => {
  if (languageHint.includes("ts")) return true;
  return /\binterface\s+\w+/.test(source) || /:\s*[A-Za-z]\w*</.test(source);
};

const buildIndexFile = () => {
  return `
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

const ensureTailwind = () => {
  if (document.getElementById("tailwind-cdn")) return;
  const link = document.createElement("link");
  link.id = "tailwind-cdn";
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

ensureTailwind();

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`.trim();
};

const baseStyles = `
:root {
  color-scheme: light;
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  padding: 24px;
  background-color: #f5f7fb;
  color: #0f172a;
}

#root {
  min-height: calc(100vh - 48px);
}
`;

const extractCompleteCodeBlock = (source: string) => {
  if (!source) return null;
  const match =
    /```(?:[\w-]+)?\s*\n([\s\S]*?)```/m.exec(source) ??
    /~~~(?:[\w-]+)?\s*\n([\s\S]*?)~~~/m.exec(source);
  return match?.[1]?.trim() ?? null;
};

export function ComponentsPreview({
  content = "",
  isStreaming = false,
}: ComponentsPreviewProps) {
  const { code: incomingCode, language } = useMemo(
    () => extractPrimaryCodeBlock(content),
    [content],
  );

  const [finalCode, setFinalCode] = useState<string>("");
  const [executionKey, setExecutionKey] = useState(0);
  const [showCode, setShowCode] = useState(true);

  const trimmedStreamingCode = incomingCode.trim();

  useEffect(() => {
    if (isStreaming) {
      if (!trimmedStreamingCode.length && finalCode) {
        setFinalCode("");
      }
      setShowCode(true);
      return;
    }
    if (finalCode) {
      setShowCode(false);
    }
  }, [isStreaming, finalCode, trimmedStreamingCode.length]);

  useEffect(() => {
    if (!trimmedStreamingCode) return;

    const codeBlock = extractCompleteCodeBlock(trimmedStreamingCode);

    if (codeBlock && codeBlock !== finalCode) {
      setFinalCode(codeBlock);
      setExecutionKey((value) => value + 1);
      return;
    }

    if (!isStreaming) {
      const trimmed = trimmedStreamingCode.trim();
      if (trimmed && trimmed !== finalCode) {
        setFinalCode(trimmed);
        setExecutionKey((value) => value + 1);
      }
    }
  }, [trimmedStreamingCode, isStreaming, finalCode]);

  const effectiveLanguage = language || "jsx";
  const isTypeScript = isProbablyTypeScript(
    finalCode || trimmedStreamingCode,
    effectiveLanguage,
  );
  const appFileName = isTypeScript ? "/App.tsx" : "/App.js";
  const componentFileName = isTypeScript
    ? "/GeneratedComponent.tsx"
    : "/GeneratedComponent.js";
  const indexFileName = isTypeScript ? "/index.tsx" : "/index.js";

  const dependencies = useMemo(() => {
    const source = finalCode || trimmedStreamingCode;
    const base: Record<string, string> = {
      react: "18.2.0",
      "react-dom": "18.2.0",
    };

    if (/['"]recharts['"]/.test(source) || /\bBarChart\b/.test(source)) {
      base.recharts = "^2.15.4";
    }
    if (/['"]framer-motion['"]/.test(source)) {
      base["framer-motion"] = "^11.11.17";
    }
    if (/['"]clsx['"]/.test(source)) {
      base.clsx = "^2.1.1";
    }
    if (/['"]lucide-react['"]/.test(source)) {
      base["lucide-react"] = "^0.491.0";
    }
    if (/['"]pptxgenjs['"]/.test(source) || /\bPptxGenJS\b/.test(source)) {
      base.pptxgenjs = "^3.12.0";
    }

    return base;
  }, [finalCode, trimmedStreamingCode]);

  const sandpackFiles = useMemo(() => {
    if (!finalCode) return undefined;

    return {
      [componentFileName]: {
        code: finalCode,
        active: false,
      },
      [appFileName]: {
        code: isTypeScript
          ? `
import React from "react";
import * as Generated from "./GeneratedComponent";

type AnyComponent = React.ComponentType<any>;

const resolveComponent = (): AnyComponent => {
  const module = Generated as Record<string, any>;
  if (module?.default && typeof module.default === "function") {
    return module.default as AnyComponent;
  }
  const candidates = Object.values(module).filter(
    (value) => typeof value === "function"
  );
  return (candidates[0] as AnyComponent) ?? (() => (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      No exportable component found.
    </div>
  ));
};

const ResolvedComponent = resolveComponent();

export default function App(): JSX.Element {
  return <ResolvedComponent />;
}
        `.trim()
          : `
import React from "react";
import * as Generated from "./GeneratedComponent";

const resolveComponent = () => {
  if (Generated && typeof Generated.default === "function") {
    return Generated.default;
  }
  const candidates = Object.values(Generated).filter(
    (value) => typeof value === "function"
  );
  return (
    candidates[0] ??
    (() => (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No exportable component found.
      </div>
    ))
  );
};

const ResolvedComponent = resolveComponent();

export default function App() {
  return <ResolvedComponent />;
}
        `.trim(),
        active: true,
      },
      [indexFileName]: {
        code: buildIndexFile(),
        hidden: true,
      },
      "/styles.css": {
        code: baseStyles,
        hidden: true,
      },
    };
  }, [finalCode, appFileName, componentFileName, indexFileName, isTypeScript]);

  const renderStatus = (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${isStreaming ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`}
        />
        <span>{isStreaming ? "Streaming code…" : "Component ready"}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
          {isTypeScript ? "React • TS" : "React • JS"}
        </span>
        {finalCode && (
          <button
            type="button"
            onClick={() => setShowCode((prev) => !prev)}
            className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            {showCode ? "Mostrar preview" : "Ver código"}
          </button>
        )}
      </div>
    </div>
  );

  const renderCodeView = (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border/60 bg-[#101421]">
        <div className="border-b border-border/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
          {finalCode ? "Generated source" : "Streaming source"}
        </div>
        <pre className="flex-1 overflow-auto px-4 py-6 text-xs text-slate-200">
          {finalCode || trimmedStreamingCode || FALLBACK_MESSAGE}
        </pre>
        {isStreaming && !finalCode && (
          <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2 text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300" />
            <span>Generating component…</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderSandpack = sandpackFiles && !showCode && finalCode && (
    <div className="absolute inset-0 rounded-xl border border-border/60 overflow-hidden">
      <SandpackProvider
        key={executionKey}
        template={isTypeScript ? "react-ts" : "react"}
        customSetup={{
          dependencies,
          entry: indexFileName,
        }}
        files={sandpackFiles}
        options={{
          activeFile: componentFileName,
          visibleFiles: [componentFileName, appFileName],
        }}
      >
        <SandpackLayout
          className="!absolute !inset-0 !border-0 !rounded-none"
          style={{ height: "100%", width: "100%" }}
        >
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            style={{ height: "100%", width: "100%" }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );

  if (!trimmedStreamingCode && !finalCode && !isStreaming) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Start building a component to see it here
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Ask for a dashboard, marketing site, or UI widget in components mode.
        </p>
      </div>
    );
  }

  const shouldShowCodeView = !finalCode || showCode;
  const bodyContent =
    shouldShowCodeView || !renderSandpack ? (
      renderCodeView
    ) : (
      <div className="relative h-full w-full">{renderSandpack}</div>
    );

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {renderStatus}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {bodyContent}
      </div>
    </div>
  );
}
