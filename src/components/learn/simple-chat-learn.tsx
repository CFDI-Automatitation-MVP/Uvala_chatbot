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
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from "ui/resizable";
import { PreviewPanel } from "../coder/preview-panel";
import { useArtifactStore } from "@/stores/artifact-store";
import { findRenderableCode } from "@/lib/code-extraction";

export function SimpleChatLearn() {
  console.log("[LEARN] ===== SimpleChatLearn component RENDERED =====");

  const t = useTranslations("Learn");
  const [_learn, appStoreMutate, currentThreadId] = appStore(
    useShallow((state) => [state.learn, state.mutate, state.currentThreadId]),
  );

  const [input, setInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const {
    addArtifact,
    clearArtifacts,
    activeArtifactId,
    loadArtifactsForThread,
  } = useArtifactStore();
  const previewPanelRef = useRef<ImperativePanelHandle>(null);

  console.log("[LEARN] Component state:", {
    messagesCount: "will check in useChat",
    showPreview,
    activeArtifactId,
    currentThreadId,
  });

  // Load artifacts when thread changes
  useEffect(() => {
    if (currentThreadId) {
      console.log("[LEARN] Loading artifacts for thread:", currentThreadId);
      loadArtifactsForThread(currentThreadId);

      // If artifacts exist for this thread, auto-open preview
      const hasArtifacts =
        useArtifactStore.getState().getArtifactsByThread(currentThreadId)
          .length > 0;
      if (hasArtifacts) {
        console.log("[LEARN] Artifacts found, auto-opening preview");
        setShowPreview(true);
      }
    }
  }, [currentThreadId, loadArtifactsForThread]);

  // Control preview panel collapse/expand with resize
  useEffect(() => {
    if (previewPanelRef.current) {
      if (showPreview) {
        console.log("[LEARN] Expanding preview panel to 50%");
        previewPanelRef.current.resize(50);
      } else {
        console.log("[LEARN] Collapsing preview panel");
        previewPanelRef.current.collapse();
      }
    }
  }, [showPreview]);

  // Chat functionality
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
      api: "/api/chat/learn",
      prepareSendMessagesRequest: ({ messages }) => {
        const learnState = appStore.getState().learn;
        return {
          body: {
            chatModel: learnState.chatModel,
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

  // Force uvala-sensei model for learn mode
  useEffect(() => {
    appStoreMutate((state) => ({
      learn: {
        ...state.learn,
        chatModel: {
          provider: "Internal",
          model: "uvala-sensei",
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

  // Create a content hash to force re-evaluation during streaming
  const lastMessageContent = useMemo(() => {
    if (messages.length === 0) return "";
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return "";
    return lastMessage.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }, [messages]);

  // Extract code from messages and create artifacts - runs during streaming AND after completion
  useEffect(() => {
    if (!lastMessageContent) return;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const isStreaming = status === "streaming" || status === "submitted";

    console.log("[LEARN] Checking for code, message ID:", lastMessage.id);
    console.log("[LEARN] Text content length:", lastMessageContent.length);
    console.log(
      "[LEARN] Streaming status:",
      status,
      "| isStreaming:",
      isStreaming,
    );
    console.log("[LEARN] Preview showing:", showPreview);

    // During streaming: just check if code exists and open preview panel (but show code view)
    const hasCodeBlockStart = lastMessageContent.includes("```");

    if (isStreaming && hasCodeBlockStart) {
      console.log(
        "[LEARN] ⏳ Streaming in progress, code detected - opening preview to show code",
      );
      if (!showPreview) {
        setShowPreview(true);
      }
      return; // Don't extract or render yet
    }

    // Only extract and render when streaming is complete
    if (status === "ready") {
      const renderableCode = findRenderableCode(lastMessageContent);

      if (renderableCode) {
        console.log("[LEARN] ✅ Streaming complete, renderable code found:", {
          type: renderableCode.type,
          codeLength: renderableCode.code.length,
          title: renderableCode.title,
        });

        // Create or update artifact
        const artifactId = `artifact-${lastMessage.id}`;
        console.log("[LEARN] Creating artifact with ID:", artifactId);

        addArtifact({
          id: artifactId,
          title: renderableCode.title || "Generated Component",
          code: renderableCode.code,
          type: renderableCode.type,
          messageId: lastMessage.id,
          threadId: currentThreadId || undefined,
        });

        console.log("[LEARN] Artifact added, showing preview");
        // Auto-show preview when artifact is created
        setShowPreview(true);
      } else {
        console.log(
          "[LEARN] ❌ No renderable code found after streaming completed",
        );
      }
    }
  }, [
    lastMessageContent,
    addArtifact,
    status,
    showPreview,
    messages,
    currentThreadId,
  ]);

  // Listen for reset event from the header button
  useEffect(() => {
    const handleReset = () => {
      resetChat();
    };

    window.addEventListener("learnReset", handleReset);
    return () => {
      window.removeEventListener("learnReset", handleReset);
    };
  }, [resetChat]);

  // Listen for manual preview trigger from header button
  useEffect(() => {
    const handleShowPreview = () => {
      console.log("[LEARN] Manual preview trigger received");
      if (activeArtifactId) {
        console.log("[LEARN] Setting showPreview to true (manual trigger)");
        setShowPreview(true);
      } else {
        console.log("[LEARN] No artifact available to preview");
      }
    };

    window.addEventListener("learnShowPreview", handleShowPreview);
    return () => {
      window.removeEventListener("learnShowPreview", handleShowPreview);
    };
  }, [activeArtifactId]);

  return (
    <div className="h-full relative">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Chat Panel */}
        <ResizablePanel defaultSize={100} minSize={30}>
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
                        <GraduationCap className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                      </div>
                      <h1 className="text-xl md:text-2xl font-semibold">
                        {t("welcome")}
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
                {/* Preview Toggle Button - Inside prompt area */}
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
                  fileUploadDisabled={false}
                  placeholder={t("inputPlaceholder")}
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
          <PreviewPanel
            isStreaming={status === "streaming" || status === "submitted"}
            streamingContent={lastMessageContent}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
