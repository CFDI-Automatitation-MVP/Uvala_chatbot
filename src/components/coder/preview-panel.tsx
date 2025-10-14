"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { CodeSandbox } from "./code-sandbox";
import { PreviewControls } from "./preview-controls";
import { useArtifactStore } from "@/stores/artifact-store";
import { cn } from "lib/utils";
import { cleanCodeForSandbox } from "@/lib/code-extraction";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface PreviewPanelProps {
  className?: string;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function PreviewPanel({
  className,
  isStreaming = false,
  streamingContent = "",
}: PreviewPanelProps) {
  const t = useTranslations("Coder");
  const activeArtifactId = useArtifactStore((state) => state.activeArtifactId);
  const artifacts = useArtifactStore((state) => state.artifacts);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get artifact directly from artifacts map - this will update when artifacts change
  const artifact = useMemo(() => {
    if (!activeArtifactId) {
      console.log("[PREVIEW PANEL] No active artifact ID");
      return null;
    }
    const art = artifacts.get(activeArtifactId);
    if (art) {
      console.log("[PREVIEW PANEL] Artifact loaded:", {
        id: activeArtifactId,
        title: art.title,
        type: art.type,
        codeLength: art.code.length,
        codePreview: art.code.substring(0, 150),
      });
    } else {
      console.log(
        "[PREVIEW PANEL] ❌ Artifact not found for ID:",
        activeArtifactId,
      );
    }
    return art;
  }, [activeArtifactId, artifacts]);

  // Check if artifact title indicates truncation
  const isTruncated = artifact?.title === "Truncated Component";

  const cleanedCode = useMemo(() => {
    if (!artifact) return "";
    const cleaned = cleanCodeForSandbox(artifact.code, artifact.type);
    console.log("[PREVIEW PANEL] Code cleaned:", {
      originalLength: artifact.code.length,
      cleanedLength: cleaned.length,
      cleanedPreview: cleaned.substring(0, 150),
    });
    return cleaned;
  }, [artifact]);

  // Auto-switch to code view during streaming, preview when complete
  useEffect(() => {
    if (isStreaming) {
      console.log(
        "[PREVIEW PANEL] Streaming detected - switching to code view",
      );
      setShowCode(true);
    } else if (!isStreaming && artifact) {
      console.log("[PREVIEW PANEL] Streaming complete - switching to preview");
      setShowCode(false);
    }
  }, [isStreaming, artifact]);

  // Reset show code when artifact changes and increment refresh
  useEffect(() => {
    // Only reset if not streaming
    if (!isStreaming) {
      setShowCode(false);
    }
    // Auto-refresh when artifact changes
    setRefreshKey((prev) => prev + 1);
  }, [activeArtifactId, isStreaming]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // const handleCloseFullscreen = () => {
  //   setIsFullscreen(false);
  // };

  // Effect to hide body overflow when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // If no artifact but we're streaming, show the streaming content
  if (!artifact && isStreaming && streamingContent) {
    return (
      <div
        className={cn(
          "flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0a0a0a]",
          className,
        )}
      >
        <PreviewControls
          code={streamingContent}
          title={t("buildingComponent")}
          showCode={true}
          onToggleCode={() => {}} // Disabled during streaming
        />

        <div className="mx-4 mt-4 mb-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              {t("generatingCode")}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-white dark:bg-[#121212] m-4 rounded-xl border border-border/20 shadow-lg">
          <div className="h-full overflow-auto p-6">
            <pre className="text-xs font-mono bg-[#1e1e1e] text-white p-6 rounded-lg overflow-x-auto">
              <code>{streamingContent}</code>
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full bg-muted/20",
          className,
        )}
      >
        <div className="text-center max-w-md px-6 space-y-4">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">{t("noPreviewAvailable")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("askAIToGenerate")}
            <br />
            {t("tryCreateTodo")}
          </p>
        </div>
      </div>
    );
  }

  const previewContent = (
    <>
      <PreviewControls
        code={artifact.code}
        title={isTruncated ? t("generatedComponentTruncated") : artifact.title}
        onRefresh={handleRefresh}
        showCode={showCode}
        onToggleCode={() => setShowCode(!showCode)}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Streaming Banner - Show when currently streaming (hide in fullscreen) */}
      {isStreaming && !isFullscreen && (
        <div className="mx-4 mt-4 mb-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              {t("codeGenerating")}
            </p>
          </div>
        </div>
      )}

      {/* Truncation Warning Banner (hide in fullscreen) */}
      {isTruncated && !isStreaming && !isFullscreen && (
        <div className="mx-4 mt-4 mb-0 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600 dark:text-yellow-400 font-semibold text-sm">
              ⚠️ {t("codeTruncated")}
            </div>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            {t("codeTruncatedMessage")} {t("tryAsking")}{" "}
            <span className="font-mono bg-yellow-100 dark:bg-yellow-900/40 px-1 py-0.5 rounded">
              {t("continueCommand")}
            </span>{" "}
            {t("orRequestSimpler")}
          </p>
        </div>
      )}

      <div
        className={cn(
          "flex-1 overflow-hidden relative bg-white dark:bg-[#121212] shadow-lg",
          isFullscreen
            ? "m-0 rounded-none border-none"
            : "m-4 rounded-xl border border-border/20",
        )}
      >
        {showCode ? (
          <div className="h-full overflow-auto p-6">
            <pre className="text-xs font-mono bg-[#1e1e1e] text-white p-6 rounded-lg overflow-x-auto">
              <code>{artifact.code}</code>
            </pre>
          </div>
        ) : (
          <CodeSandbox
            key={`${activeArtifactId}-${refreshKey}`}
            code={cleanedCode}
            type={
              artifact.type === "react" ||
              artifact.type === "html" ||
              artifact.type === "vue"
                ? artifact.type
                : "react"
            }
            className={cn(
              "h-full overflow-hidden",
              isFullscreen ? "rounded-none" : "rounded-xl",
            )}
          />
        )}
      </div>

      {/* Footer with Generated by Uvala - only in fullscreen */}
      {isFullscreen && (
        <div className="px-4 pb-3 pt-2 bg-[#f8f9fa] dark:bg-[#0a0a0a] border-t border-border/20">
          <p className="text-[10px] text-center text-muted-foreground lowercase">
            {t("generatedBy")}
          </p>
        </div>
      )}
    </>
  );

  // Render fullscreen mode using portal to body
  if (isFullscreen && typeof window !== "undefined") {
    const fullscreenElement = (
      <div className="fixed inset-0 z-[99999] bg-white dark:bg-black flex flex-col overflow-hidden">
        {/* Fullscreen Content Wrapper */}
        <div className="flex flex-col h-full w-full overflow-hidden">
          {previewContent}
        </div>
      </div>
    );

    return createPortal(fullscreenElement, document.body);
  }

  // Normal mode
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0a0a0a]",
        className,
      )}
    >
      {previewContent}
    </div>
  );
}
