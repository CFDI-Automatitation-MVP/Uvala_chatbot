"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { Maximize2, X } from "lucide-react";

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
/* ═══════════════════════════════════════════════════════════
   PREMIUM DESIGN SYSTEM - CSS Custom Properties
   ═══════════════════════════════════════════════════════════ */

:root {
  /* ─────────────────────────────────────────────────────────
     COLOR PALETTE - HSL for easy manipulation
     ───────────────────────────────────────────────────────── */
  --color-primary: 217 91% 60%;        /* Blue #3b82f6 */
  --color-primary-dark: 217 91% 50%;
  --color-secondary: 262 83% 58%;      /* Purple #8b5cf6 */
  --color-accent: 142 76% 36%;         /* Green #059669 */
  --color-warning: 43 96% 56%;         /* Orange #f59e0b */
  --color-danger: 0 84% 60%;           /* Red #ef4444 */

  /* Backgrounds */
  --color-bg-primary: 0 0% 100%;       /* White */
  --color-bg-secondary: 220 13% 97%;   /* Gray-50 #f9fafb */
  --color-bg-tertiary: 214 32% 91%;    /* Gray-100 */

  /* Text Colors */
  --color-text-primary: 222 47% 11%;   /* Gray-900 #111827 */
  --color-text-secondary: 215 16% 47%; /* Gray-600 #4b5563 */
  --color-text-muted: 215 20% 65%;     /* Gray-400 */

  /* Borders */
  --color-border-light: 214 32% 91%;   /* Gray-200 */
  --color-border: 215 16% 84%;         /* Gray-300 */

  /* ─────────────────────────────────────────────────────────
     GRADIENTS
     ───────────────────────────────────────────────────────── */
  --gradient-primary: linear-gradient(135deg,
    hsl(217 91% 60%),
    hsl(244 90% 67%)
  );
  --gradient-success: linear-gradient(135deg,
    hsl(142 76% 45%),
    hsl(158 64% 52%)
  );
  --gradient-warm: linear-gradient(135deg,
    hsl(43 96% 56%),
    hsl(25 95% 53%)
  );
  --gradient-cool: linear-gradient(135deg,
    hsl(199 89% 48%),
    hsl(217 91% 60%)
  );

  /* ─────────────────────────────────────────────────────────
     SHADOWS & ELEVATION
     ───────────────────────────────────────────────────────── */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  --shadow-glow-primary: 0 10px 30px -10px hsla(217, 91%, 60%, 0.4);
  --shadow-glow-success: 0 10px 30px -10px hsla(142, 76%, 45%, 0.4);

  /* ─────────────────────────────────────────────────────────
     SPACING SYSTEM (4px base)
     ───────────────────────────────────────────────────────── */
  --space-xs: 0.5rem;   /* 8px */
  --space-sm: 0.75rem;  /* 12px */
  --space-md: 1rem;     /* 16px */
  --space-lg: 1.5rem;   /* 24px */
  --space-xl: 2rem;     /* 32px */
  --space-2xl: 3rem;    /* 48px */
  --space-3xl: 4rem;    /* 64px */

  /* ─────────────────────────────────────────────────────────
     TYPOGRAPHY
     ───────────────────────────────────────────────────────── */
  --font-display: 600;
  --font-heading: 600;
  --font-body: 400;
  --font-medium: 500;

  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-5xl: 3rem;        /* 48px */

  /* ─────────────────────────────────────────────────────────
     BORDER RADIUS
     ───────────────────────────────────────────────────────── */
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;

  /* ─────────────────────────────────────────────────────────
     TRANSITIONS
     ───────────────────────────────────────────────────────── */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* ─────────────────────────────────────────────────────────
     Z-INDEX LAYERS
     ───────────────────────────────────────────────────────── */
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal: 1040;
  --z-popover: 1050;
  --z-tooltip: 1060;

  color-scheme: light;
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Remove default borders from all elements */
*,
*::before,
*::after {
  border: 0 solid transparent;
}

body {
  margin: 0;
  min-height: 100vh;
  background: hsl(var(--color-bg-secondary));
  color: hsl(var(--color-text-primary));
  font-size: var(--text-base);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}

/* Remove default table borders */
table {
  border-collapse: collapse;
  border-spacing: 0;
}

table td,
table th {
  border: none;
}

/* Only show borders when explicitly added */
.border,
[class*="border-"] {
  border-style: solid;
}

/* ═══════════════════════════════════════════════════════════
   UTILITY CLASSES FOR COMMON PATTERNS
   ═══════════════════════════════════════════════════════════ */

.card-glass {
  background: hsla(var(--color-bg-primary), 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--color-border-light));
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.card-elevated {
  background: hsl(var(--color-bg-primary));
  border: 1px solid hsl(var(--color-border-light));
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  transition: var(--transition-smooth);
}

.card-elevated:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-2xl);
}

.gradient-primary {
  background: var(--gradient-primary);
}

.gradient-success {
  background: var(--gradient-success);
}

.text-gradient-primary {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.button-primary {
  background: hsl(var(--color-primary));
  color: white;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  border: none;
  cursor: pointer;
  transition: var(--transition-base);
  box-shadow: var(--shadow-glow-primary);
}

.button-primary:hover {
  background: hsl(var(--color-primary-dark));
  transform: translateY(-1px);
  box-shadow: var(--shadow-xl);
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <>
            <button
              type="button"
              onClick={() => setShowCode((prev) => !prev)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {showCode ? "Mostrar preview" : "Ver código"}
            </button>
            {!showCode && (
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary flex items-center gap-1.5"
                title="Open in fullscreen"
              >
                <Maximize2 className="h-3 w-3" />
                Full Screen
              </button>
            )}
          </>
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

  const shouldShowCodeView = !finalCode || showCode;
  const bodyContent =
    shouldShowCodeView || !renderSandpack ? (
      renderCodeView
    ) : (
      <div className="relative h-full w-full">{renderSandpack}</div>
    );

  // Full-screen modal with clean preview (no UI elements) - using Portal
  const renderFullScreenModal =
    mounted && isFullScreen && sandpackFiles && finalCode
      ? createPortal(
          <div
            className="fixed inset-0 bg-white dark:bg-gray-950"
            style={{ zIndex: 2147483647 }}
          >
            {/* Close button - only UI element in full-screen */}
            <button
              onClick={() => setIsFullScreen(false)}
              className="fixed top-4 right-4 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-red-500 hover:text-white rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl transition-all duration-200 group"
              style={{ zIndex: 2147483647 }}
              title="Exit fullscreen (Esc)"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Keyboard shortcut hint */}
            <div
              className="fixed top-4 left-4 px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg text-xs text-gray-600 dark:text-gray-400"
              style={{ zIndex: 2147483647 }}
            >
              Press{" "}
              <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono">
                Esc
              </kbd>{" "}
              to exit
            </div>

            {/* Full-screen Sandpack preview */}
            <div className="absolute inset-0 w-full h-full">
              <SandpackProvider
                key={`fullscreen-${executionKey}`}
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
          </div>,
          document.body,
        )
      : null;

  // Handle Escape key to exit full-screen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    if (isFullScreen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when in full-screen
      document.body.style.overflow = "hidden";
      // Hide all other content by adding a class to the root
      const root =
        document.getElementById("__next") || document.getElementById("root");
      if (root) {
        root.style.display = "none";
      }
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      // Restore visibility
      const root =
        document.getElementById("__next") || document.getElementById("root");
      if (root) {
        root.style.display = "";
      }
    };
  }, [isFullScreen]);

  // Conditional render for empty state
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

  return (
    <>
      <div className="flex h-full flex-col gap-3 overflow-hidden">
        {renderStatus}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {bodyContent}
        </div>
      </div>
      {/* Portal renders outside of React tree at document.body */}
      {renderFullScreenModal}
    </>
  );
}
