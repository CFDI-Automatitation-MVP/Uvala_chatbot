"use client";

import { ReactNode } from "react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { GripVertical } from "lucide-react";

interface ComponentsPanelProps {
  children: ReactNode;
  messageCount?: number;
  preview?: ReactNode;
}

export function ComponentsPanel({
  children,
  messageCount = 0,
  preview,
}: ComponentsPanelProps) {
  const [chatMode] = appStore(useShallow((state) => [state.chatMode]));

  // Only show split panel in components mode when there are messages
  const showSplitPanel = chatMode === "components" && messageCount > 0;

  if (!showSplitPanel) {
    // Normal single-column layout for non-components modes
    return <div className="h-full">{children}</div>;
  }

  // Resizable split layout for components mode
  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* Left Panel: Chat */}
      <Panel defaultSize={50} minSize={30} maxSize={70}>
        <div className="h-full flex flex-col border-r border-border">
          {children}
        </div>
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className="w-2 bg-muted/30 hover:bg-primary/20 transition-colors relative group">
        <div className="absolute inset-y-0 flex items-center justify-center w-full">
          <div className="flex flex-col gap-1">
            <div className="w-0.5 h-8 bg-muted-foreground/20 rounded-full" />
            <div className="w-0.5 h-8 bg-muted-foreground/20 rounded-full" />
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-primary/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-primary/30">
            <GripVertical className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </PanelResizeHandle>

      {/* Right Panel: Components Preview */}
      <Panel defaultSize={50} minSize={30} maxSize={70}>
        <div className="h-full flex flex-col bg-muted/20">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 bg-background/50 backdrop-blur-sm flex-shrink-0">
            <h2 className="text-sm font-semibold text-foreground">
              Components Preview
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live preview of your components
            </p>
          </div>

          {/* Preview Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {preview ? (
              <div className="h-full w-full p-4">{preview}</div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <div className="text-center">
                  <div className="mb-2">Preview area</div>
                  <div className="text-xs">Components will render here</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </PanelGroup>
  );
}
