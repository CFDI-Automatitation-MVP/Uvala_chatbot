"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { PreviewMessage, ErrorMessage } from "../message";
import PromptInput from "../prompt-input";
import { Think } from "ui/think";
import { cn } from "lib/utils";
import { Code, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from "ui/resizable";
import { PreviewPanel } from "./preview-panel";
import { useArtifactStore } from "@/stores/artifact-store";
import { findRenderableCode } from "@/lib/code-extraction";

export function SimpleChatCoder() {
  const t = useTranslations("Coder");
  const [_coder, appStoreMutate, currentThreadId] = appStore(
    useShallow((state) => [state.coder, state.mutate, state.currentThreadId]),
  );

  const [input, setInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const { addArtifact, clearArtifacts, activeArtifactId, loadArtifactsForThread } = useArtifactStore();
  const previewPanelRef = useRef<ImperativePanelHandle>(null);

  // Load artifacts when thread changes
  useEffect(() => {
    if (currentThreadId) {
      console.log("[CODER POPUP] Loading artifacts for thread:", currentThreadId);
      loadArtifactsForThread(currentThreadId);

      // If artifacts exist for this thread, auto-open preview
      const hasArtifacts = useArtifactStore.getState().getArtifactsByThread(currentThreadId).length > 0;
      if (hasArtifacts) {
        console.log("[CODER POPUP] Artifacts found, auto-opening preview");
        setShowPreview(true);
      }
    }
  }, [currentThreadId, loadArtifactsForThread]);

  // Debug logging for state changes
  useEffect(() => {
    console.log("[CODER STATE] showPreview:", showPreview);
  }, [showPreview]);

  useEffect(() => {
    console.log("[CODER STATE] activeArtifactId:", activeArtifactId);
  }, [activeArtifactId]);

  // Control preview panel collapse/expand with resize
  useEffect(() => {
    if (previewPanelRef.current) {
      if (showPreview) {
        console.log("[CODER DEBUG] Expanding preview panel to 50%");
        previewPanelRef.current.resize(50);
      } else {
        console.log("[CODER DEBUG] Collapsing preview panel");
        previewPanelRef.current.collapse();
      }
    }
  }, [showPreview]);

  // Chat functionality with persistence
  const {
    messages,
    sendMessage,
    clearError,
    status,
    setMessages,
    error,
    stop,
  } = useChat({
    id: currentThreadId || undefined, // Use thread ID for persistence
    transport: new DefaultChatTransport({
      api: "/api/chat/coder",
      prepareSendMessagesRequest: ({ messages }) => {
        const coderState = appStore.getState().coder;
        return {
          body: {
            chatModel: coderState.chatModel,
            messages,
          },
        };
      },
    }),
    experimental_throttle: 100,
    onError: () => {
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const isLoading = useMemo(
    () => status === "streaming" || status === "submitted",
    [status],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(false);

  // Auto-scroll functionality for chat
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
      });
    }
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      autoScrollRef.current = true;
      const handleScroll = () => {
        const el = containerRef.current!;
        const isAtBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < 20;
        if (!isAtBottom) {
          autoScrollRef.current = false;
        }
      };
      containerRef.current?.addEventListener("scroll", handleScroll);
      return () => {
        containerRef.current?.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isLoading]);

  // Force uvala-coder model for coder
  useEffect(() => {
    appStoreMutate((state) => ({
      coder: {
        ...state.coder,
        chatModel: {
          provider: "Internal",
          model: "uvala-coder",
        },
      },
    }));
  }, [appStoreMutate]);

  const resetChat = useCallback(() => {
    setMessages([]);
    clearError();
    setInput("");
    clearArtifacts();
  }, [setMessages, clearError, setInput, clearArtifacts]);

  // Extract code from messages and create artifacts
  useEffect(() => {
    console.log("[CODER DEBUG] Messages changed, count:", messages.length);
    console.log("[CODER DEBUG] Full messages array:", messages);

    if (messages.length === 0) {
      console.log("[CODER DEBUG] No messages, skipping extraction");
      return;
    }

    const lastMessage = messages[messages.length - 1];
    console.log("[CODER DEBUG] Last message:", lastMessage);
    console.log("[CODER DEBUG] Last message role:", lastMessage.role);
    console.log("[CODER DEBUG] Last message parts:", lastMessage.parts);
    console.log("[CODER DEBUG] Last message parts count:", lastMessage.parts?.length);

    if (lastMessage.role !== "assistant") {
      console.log("[CODER DEBUG] Last message is not from assistant, skipping");
      return;
    }

    // Get the text content from the last message
    const textContent = lastMessage.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");

    console.log("[CODER DEBUG] Text content length:", textContent.length);
    console.log("[CODER DEBUG] Text content preview:", textContent.substring(0, 200));

    // Try to find renderable code
    const renderableCode = findRenderableCode(textContent);

    console.log("[CODER DEBUG] Renderable code found:", !!renderableCode);
    if (renderableCode) {
      console.log("[CODER DEBUG] Code type:", renderableCode.type);
      console.log("[CODER DEBUG] Code title:", renderableCode.title);
      console.log("[CODER DEBUG] Code length:", renderableCode.code.length);

      // Create or update artifact
      const artifactId = `artifact-${lastMessage.id}`;
      console.log("[CODER DEBUG] Creating artifact with ID:", artifactId);
      console.log("[CODER DEBUG] Current thread ID:", currentThreadId);

      addArtifact({
        id: artifactId,
        title: renderableCode.title || "Generated Component",
        code: renderableCode.code,
        type: renderableCode.type,
        messageId: lastMessage.id,
        threadId: currentThreadId || undefined, // Add threadId for persistence
      });

      console.log("[CODER DEBUG] Artifact added, showing preview");
      // Auto-show preview when artifact is created
      setShowPreview(true);
    } else {
      console.log("[CODER DEBUG] No renderable code found in message");
    }
  }, [messages, addArtifact, currentThreadId]);

  // Listen for reset event from the header button
  useEffect(() => {
    const handleReset = () => {
      resetChat();
    };

    window.addEventListener("coderReset", handleReset);
    return () => {
      window.removeEventListener("coderReset", handleReset);
    };
  }, [resetChat]);

  // Listen for manual preview trigger from header button
  useEffect(() => {
    const handleShowPreview = () => {
      console.log("[CODER DEBUG] Manual preview trigger received");
      if (activeArtifactId) {
        console.log("[CODER DEBUG] Setting showPreview to true (manual trigger)");
        setShowPreview(true);
      } else {
        console.log("[CODER DEBUG] No artifact available to preview");
      }
    };

    window.addEventListener("coderShowPreview", handleShowPreview);
    return () => {
      window.removeEventListener("coderShowPreview", handleShowPreview);
    };
  }, [activeArtifactId]);

  return (
    <div className="h-full relative">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Chat Panel */}
        <ResizablePanel
          defaultSize={100}
          minSize={30}
        >
          <div className="h-full flex flex-col pb-2">
          <div
            className={cn(
              "flex flex-col min-w-0 h-full flex-1 overflow-y-hidden",
            )}
          >
        {!messages.length && !error && (
          <div className="flex-1 items-center flex">
            <div className="max-w-3xl mx-auto my-4 p-4 md:p-6">
              <div className="rounded-xl p-4 md:p-6 flex flex-col gap-2 leading-relaxed text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Code className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <h1 className="text-xl md:text-2xl font-semibold">
                  {t("aiCodingAssistant")}
                </h1>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  {t("description")}
                </p>
                <div className="text-left space-y-2 text-xs md:text-sm">
                  <p className="font-medium">{t("examples")}:</p>
                  <div className="bg-muted rounded-lg p-2 md:p-3 space-y-1">
                    <p>• {t("example1")}</p>
                    <p>• {t("example2")}</p>
                    <p>• {t("example3")}</p>
                    <p>• {t("example4")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={
            "flex flex-col gap-2 overflow-y-auto py-3 md:py-6 px-2 md:px-0"
          }
          ref={containerRef}
        >
          {messages.map((message, index) => {
            const isLastMessage = messages.length - 1 === index;
            return (
              <PreviewMessage
                messageIndex={index}
                key={index}
                message={message}
                status={status}
                isLoading={isLoading}
                isLastMessage={isLastMessage}
                setMessages={setMessages}
                prevMessage={messages[index - 1]}
                sendMessage={sendMessage}
              />
            );
          })}
          {isLoading && (
            <div className="w-full mx-auto max-w-3xl px-3 md:px-6">
              <Think />
            </div>
          )}
          {error && <ErrorMessage error={error} />}
        </div>

            <div className={"w-full mb-4 mt-auto px-2 md:px-0 relative"}>
              {/* Build Component Button - Inside prompt area */}
              {activeArtifactId && (
                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="ghost"
                  size="sm"
                  className="absolute -top-12 right-4 z-50 rounded-full shadow-lg backdrop-blur-sm bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all gap-2"
                  title={showPreview ? "Hide preview" : "Show preview"}
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span className="text-xs">Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">Preview</span>
                    </>
                  )}
                </Button>
              )}
              <PromptInput
                input={input}
                sendMessage={sendMessage}
                disabledMention={true}
                toolDisabled
                fileUploadDisabled={true}
                placeholder={t("placeholder")}
                setInput={setInput}
                voiceDisabled={false}
                isLoading={isLoading}
                onStop={stop}
              />
            </div>
          </div>
        </div>
        </ResizablePanel>

        {/* Resizable Handle - Always render */}
        <ResizableHandle withHandle />

        {/* Preview Panel - Always render, use collapsible with ref */}
        <ResizablePanel
          ref={previewPanelRef}
          defaultSize={0}
          minSize={30}
          maxSize={70}
          collapsible={true}
          collapsedSize={0}
        >
          <PreviewPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
