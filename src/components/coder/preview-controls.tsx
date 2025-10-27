"use client";

import { Button } from "ui/button";
import {
  Copy,
  RefreshCw,
  Maximize2,
  Minimize2,
  Eye,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "lib/utils";

interface PreviewControlsProps {
  code: string;
  title?: string;
  onRefresh?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  showCode?: boolean;
  onToggleCode?: () => void;
  className?: string;
}

export function PreviewControls({
  code,
  title,
  onRefresh,
  onToggleFullscreen,
  isFullscreen = false,
  showCode = false,
  onToggleCode,
  className,
}: PreviewControlsProps) {
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    } catch (_error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-3 bg-[#1e1e1e] dark:bg-[#1e1e1e] border-b border-border/40",
        className,
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* macOS-style traffic lights */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 transition-colors" />
        </div>
        {title && (
          <h3 className="text-sm font-medium truncate text-white/90">
            {title}
          </h3>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onToggleCode && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10 text-white/70 hover:text-white"
            onClick={() => {
              console.log(
                "[PREVIEW CONTROLS] Toggle code view. Current showCode:",
                showCode,
              );
              console.log("[PREVIEW CONTROLS] Code length:", code?.length || 0);
              onToggleCode();
            }}
            title={showCode ? "Show preview" : "Show code"}
          >
            {showCode ? (
              <Eye className="h-4 w-4" />
            ) : (
              <Code2 className="h-4 w-4" />
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-white/10 text-white/70 hover:text-white"
          onClick={handleCopyCode}
          title="Copy code"
        >
          <Copy className="h-4 w-4" />
        </Button>

        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10 text-white/70 hover:text-white"
            onClick={onRefresh}
            title="Refresh preview"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}

        {onToggleFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10 text-white/70 hover:text-white"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
