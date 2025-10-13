"use client";

import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PromptInput from "./prompt-input";
import clsx from "clsx";
import { appStore } from "@/app/store";
import { cn, generateUUID, truncateString } from "lib/utils";
import { ErrorMessage, PreviewMessage } from "./message";
import { ChatGreeting } from "./chat-greeting";
import {
  validateFile,
  getFileValidation,
  formatFileSize,
} from "@/lib/file-upload";

import { useShallow } from "zustand/shallow";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from "ai";
import type { AttachmentFile } from "./file-attachment";

import { safe } from "ts-safe";
import { mutate } from "swr";
import { ChatApiSchemaRequestBody, ChatModel } from "app-types/chat";
import { useToRef } from "@/hooks/use-latest";
import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";
import { Button } from "ui/button";
import { deleteThreadAction } from "@/app/api/chat/actions";
import { useRouter } from "next/navigation";
import { ArrowDown, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { useTranslations } from "next-intl";
import { Think } from "ui/think";
import { useGenerateThreadTitle } from "@/hooks/queries/use-generate-thread-title";
import dynamic from "next/dynamic";
import { useMounted } from "@/hooks/use-mounted";
import { getStorageManager } from "lib/browser-stroage";
import { AnimatePresence, motion } from "framer-motion";
import { ChatModeBanner } from "./chat-mode-banner";
import { useArtifactStore } from "@/stores/artifact-store";
import { findRenderableCode } from "@/lib/code-extraction";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from "ui/resizable";
import { PreviewPanel } from "./coder/preview-panel";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  threadId: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel?: string;
};

const RippleBackground = dynamic(
  () =>
    import("@/components/ripple-background").then((mod) => ({
      default: mod.RippleBackground,
    })),
  {
    ssr: false,
  },
);

// const debounce = createDebounce(); // Unused for now

const firstTimeStorage = getStorageManager("IS_FIRST");
const isFirstTime = firstTimeStorage.get() ?? true;
firstTimeStorage.set(false);

export default function ChatBot({ threadId, initialMessages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const t = useTranslations();

  const [
    appStoreMutate,
    model,
    chatMode,
    toolChoice,
    allowedAppDefaultToolkit,
    threadList,
    threadMentions,
    pendingThreadMention,
  ] = appStore(
    useShallow((state) => [
      state.mutate,
      state.chatModel,
      state.chatMode,
      state.toolChoice,
      state.allowedAppDefaultToolkit,
      state.threadList,
      state.threadMentions,
      state.pendingThreadMention,
    ]),
  );

  // Coder mode preview state
  const [showPreview, setShowPreview] = useState(false);
  const [isContextLimitReached, setIsContextLimitReached] = useState(false);
  const continuationArtifactIdRef = useRef<string | null>(null);
  const { addArtifact, clearArtifacts, activeArtifactId, loadArtifactsForThread } = useArtifactStore();
  const previewPanelRef = useRef<ImperativePanelHandle>(null);
  const isCoderMode = chatMode === "coder";

  // Load artifacts for this thread when mounting or switching threads
  useEffect(() => {
    if (threadId && isCoderMode) {
      console.log("[CODER MODE] Loading artifacts for thread:", threadId);
      loadArtifactsForThread(threadId);

      // If artifacts exist for this thread, auto-open preview
      const hasArtifacts = useArtifactStore.getState().getArtifactsByThread(threadId).length > 0;
      if (hasArtifacts) {
        console.log("[CODER MODE] Artifacts found, auto-opening preview");
        setShowPreview(true);
      }
    }
  }, [threadId, isCoderMode, loadArtifactsForThread]);

  const generateTitle = useGenerateThreadTitle({
    threadId,
  });

  const [_showParticles, _setShowParticles] = useState(true);
  const [fileAttachments, setFileAttachments] = useState<AttachmentFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const onFinish = useCallback(() => {
    const messages = latestRef.current.messages;
    const prevThread = latestRef.current.threadList.find(
      (v) => v.id === threadId,
    );
    const isNewThread =
      !prevThread?.title &&
      messages.filter((v) => v.role === "user" || v.role === "assistant")
        .length < 3;
    if (isNewThread) {
      const part = messages
        .slice(0, 2)
        .flatMap((m) =>
          m.parts
            .filter((v) => v.type === "text")
            .map((p) => `${m.role}: ${truncateString(p.text, 500)}`),
        );
      if (part.length > 0) {
        generateTitle(part.join("\n\n"));
      }
    } else if (latestRef.current.threadList[0]?.id !== threadId) {
      mutate("/api/thread");
    }
  }, []);

  const [input, setInput] = useState("");

  const {
    messages,
    status,
    setMessages,
    addToolResult: _addToolResult,
    error,
    sendMessage,
    stop,
  } = useChat({
    id: threadId,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ messages, body, id }) => {
        if (window.location.pathname !== `/chat/${threadId}`) {
          console.log("replace-state");
          window.history.replaceState({}, "", `/chat/${threadId}`);
        }
        const lastMessage = messages.at(-1)!;

        const requestBody: ChatApiSchemaRequestBody = {
          ...body,
          id,
          chatModel:
            (body as { model: ChatModel })?.model ?? latestRef.current.model,
          chatMode: latestRef.current.chatMode,
          toolChoice: latestRef.current.toolChoice,
          allowedAppDefaultToolkit: latestRef.current.mentions?.length
            ? []
            : latestRef.current.allowedAppDefaultToolkit,
          mentions: latestRef.current.mentions,
          message: lastMessage,
        };
        return { body: requestBody };
      },
    }),
    messages: initialMessages,
    generateId: generateUUID,
    experimental_throttle: 100,
    onFinish,
  });
  const [isDeleteThreadPopupOpen, setIsDeleteThreadPopupOpen] = useState(false);

  const addToolResult = useCallback(
    async (result: Parameters<typeof _addToolResult>[0]) => {
      await _addToolResult(result);
      // sendMessage();
    },
    [_addToolResult],
  );

  const mounted = useMounted();

  const latestRef = useToRef({
    toolChoice,
    model,
    chatMode,
    allowedAppDefaultToolkit,
    messages,
    threadList,
    threadId,
    mentions: threadMentions[threadId],
  });

  const isLoading = useMemo(
    () => status === "streaming" || status === "submitted",
    [status],
  );

  const emptyMessage = useMemo(
    () => messages.length === 0 && !error,
    [messages.length, error],
  );

  const isInitialThreadEntry = useMemo(
    () =>
      initialMessages.length > 0 &&
      initialMessages.at(-1)?.id === messages.at(-1)?.id,
    [messages],
  );

  const isPendingToolCall = useMemo(() => {
    if (status != "ready") return false;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role != "assistant") return false;

    // Check if there are any pending tool calls in the entire last message
    const hasPendingToolCall = lastMessage.parts.some((part) => {
      if (!isToolUIPart(part)) return false;
      // Tool is pending if it's not in an output state
      return !part.state.startsWith("output");
    });

    return hasPendingToolCall;
  }, [status, messages]);

  const space = useMemo(() => {
    if (!isLoading || error) return false;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role == "user") return "think";
    const lastPart = lastMessage?.parts.at(-1);
    if (!lastPart) return "think";
    const secondPart = lastMessage?.parts[1];
    if (secondPart?.type == "text" && secondPart.text.length == 0)
      return "think";
    if (lastPart?.type == "step-start") {
      return lastMessage?.parts.length == 1 ? "think" : "space";
    }
    return false;
  }, [isLoading, messages.at(-1)]);

  const handleFocus = useCallback(() => {
    // Keep background visible - Orb component is optimized for performance
    // setShowParticles(false);
    // debounce(() => setShowParticles(true), 60000);
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isScrollAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setIsAtBottom(isScrollAtBottom);
    handleFocus();
  }, [handleFocus]);

  const scrollToBottom = useCallback(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // Handle file drop functionality
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (isLoading) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      files.forEach((file) => {
        // Allow images and PDFs
        const isImage = file.type.startsWith("image/");
        const isPDF = file.type === "application/pdf";

        if (!isImage && !isPDF) {
          toast.error(
            `File type "${file.type}" is not supported. Only images and PDFs are allowed.`,
          );
          return;
        }

        // Validate file size and type using the validation utility
        const validation = getFileValidation(file);
        const validationResult = validateFile(file, validation);

        if (!validationResult.valid) {
          toast.error(`Upload failed: ${validationResult.error}`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            const attachmentFile: AttachmentFile = {
              type: "file",
              name: file.name,
              url: dataUrl,
              mediaType: file.type,
            };

            setFileAttachments((prev) => [...prev, attachmentFile]);
            toast.success(
              `File "${file.name}" (${formatFileSize(file.size)}) uploaded successfully.`,
            );
          }
        };

        reader.onerror = () => {
          toast.error(`Failed to read file "${file.name}". Please try again.`);
        };

        reader.readAsDataURL(file);
      });
    },
    [isLoading],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Ensure we set the correct dropEffect for macOS compatibility
      e.dataTransfer.dropEffect = "copy";
      if (!isLoading) {
        setIsDragOver(true);
      }
    },
    [isLoading],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Check if we have files being dragged
      if (e.dataTransfer.types.includes("Files") && !isLoading) {
        setIsDragOver(true);
      }
    },
    [isLoading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragOver to false if we're leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  useEffect(() => {
    appStoreMutate((state) => ({ ...state, currentThreadId: threadId }));
    return () => {
      appStoreMutate((state) => ({ ...state, currentThreadId: null }));
    };
  }, [threadId]);

  useEffect(() => {
    if (pendingThreadMention && threadId) {
      appStore.setState((prev) => ({
        threadMentions: {
          ...prev.threadMentions,
          [threadId]: [pendingThreadMention],
        },
        pendingThreadMention: undefined,
      }));
    }
  }, [pendingThreadMention, threadId]);

  useEffect(() => {
    if (isInitialThreadEntry)
      containerRef.current?.scrollTo({
        top: containerRef.current?.scrollHeight,
        behavior: "instant",
      });
  }, [isInitialThreadEntry]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const messages = latestRef.current.messages;
      if (messages.length === 0) return;
      const isLastMessageCopy = isShortcutEvent(e, Shortcuts.lastMessageCopy);
      const isDeleteThread = isShortcutEvent(e, Shortcuts.deleteThread);
      if (!isDeleteThread && !isLastMessageCopy) return;
      e.preventDefault();
      e.stopPropagation();
      if (isLastMessageCopy) {
        const lastMessage = messages.at(-1);
        const lastMessageText = lastMessage!.parts
          .filter((part) => part.type == "text")
          ?.at(-1)?.text;
        if (!lastMessageText) return;
        navigator.clipboard.writeText(lastMessageText);
        toast.success("Last message copied to clipboard");
      }
      if (isDeleteThread) {
        setIsDeleteThreadPopupOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (mounted) {
      handleFocus();
    }
  }, [input]);

  // Auto-scroll to bottom when messages change (for coder mode especially)
  useEffect(() => {
    if (!isCoderMode) return;
    if (messages.length === 0) return;

    // Auto-scroll when new messages are added or when streaming
    const timeoutId = setTimeout(() => {
      if (isAtBottom || isLoading) {
        scrollToBottom();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages.length, isLoading, isCoderMode, isAtBottom, scrollToBottom]);

  // Create a content hash to force re-evaluation during streaming
  const lastMessageContent = useMemo(() => {
    if (!isCoderMode || messages.length === 0) return "";
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return "";
    return lastMessage.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }, [messages, isCoderMode]);

  // Code extraction for coder mode - only creates artifacts when streaming is COMPLETE
  useEffect(() => {
    if (!isCoderMode) return;
    if (!lastMessageContent) return;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const isStreaming = status === "streaming" || status === "submitted";

    console.log("[CODER MODE] Checking for code, message ID:", lastMessage.id);
    console.log("[CODER MODE] Text content length:", lastMessageContent.length);
    console.log("[CODER MODE] Streaming status:", status, "| isStreaming:", isStreaming);
    console.log("[CODER MODE] Preview showing:", showPreview);

    // During streaming: just check if code exists and open preview panel (but show code view)
    const hasCodeBlockStart = lastMessageContent.includes("```");

    if (isStreaming && hasCodeBlockStart) {
      console.log("[CODER MODE] ⏳ Streaming in progress, code detected - opening preview to show code");
      if (!showPreview) {
        setShowPreview(true);
      }
      return; // Don't extract or render yet
    }

    // Only extract and render when streaming is complete
    if (status === "ready") {
      const renderableCode = findRenderableCode(lastMessageContent);

      if (renderableCode) {
        console.log("[CODER MODE] ✅ Streaming complete, renderable code found:", {
          type: renderableCode.type,
          codeLength: renderableCode.code.length,
          title: renderableCode.title
        });

        // Check if this is a continuation of a previous artifact
        const artifactId = continuationArtifactIdRef.current || `artifact-${lastMessage.id}`;

        console.log("[CODER MODE] Using artifact ID:", {
          artifactId,
          isContinuation: !!continuationArtifactIdRef.current,
          previousArtifactId: continuationArtifactIdRef.current
        });

        // Check if this is a truncated component
        const isTruncated = renderableCode.title === "Truncated Component";

        // Detect context limit: streaming stopped but code block is incomplete
        const hasOpeningMarker = lastMessageContent.includes("```");
        const closingMarkerCount = (lastMessageContent.match(/```/g) || []).length;
        const isIncomplete = hasOpeningMarker && closingMarkerCount % 2 !== 0;

        if (isIncomplete) {
          console.log("[CODER MODE] ⚠️ Context limit detected - incomplete code block");
          setIsContextLimitReached(true);
        } else {
          setIsContextLimitReached(false);
          // Clear continuation flag when complete
          if (continuationArtifactIdRef.current) {
            console.log("[CODER MODE] Clearing continuation flag");
            continuationArtifactIdRef.current = null;
          }
        }

        // Create/update the artifact now that streaming is complete
        addArtifact({
          id: artifactId,
          title: isTruncated ? "Truncated Component" : renderableCode.title || "Generated Component",
          code: renderableCode.code,
          type: renderableCode.type,
          messageId: lastMessage.id,
          threadId: threadId, // Add threadId for persistence
        });

        // Show preview automatically
        if (!showPreview) {
          console.log("[CODER MODE] Auto-opening preview");
          setShowPreview(true);
        }
      } else {
        console.log("[CODER MODE] ❌ No renderable code found after streaming completed");
        setIsContextLimitReached(false);
      }
    }
  }, [lastMessageContent, isCoderMode, addArtifact, status, showPreview, messages]);

  // Control preview panel programmatically
  useEffect(() => {
    if (!isCoderMode) return;
    if (previewPanelRef.current) {
      if (showPreview) {
        console.log("[CODER MODE] Expanding preview panel");
        previewPanelRef.current.expand();
      } else {
        console.log("[CODER MODE] Collapsing preview panel");
        previewPanelRef.current.collapse();
      }
    }
  }, [showPreview, isCoderMode]);

  // Clear artifacts when switching away from coder mode
  useEffect(() => {
    if (!isCoderMode) {
      clearArtifacts();
      setShowPreview(false);
    }
  }, [isCoderMode, clearArtifacts]);

  return (
    <>
      {/* Show Ripple only when starting new chat (no messages) */}
      {emptyMessage && <RippleBackground />}

      {isCoderMode && !emptyMessage ? (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={100} minSize={30}>
            <div
              className={cn(
                "flex flex-col min-w-0 relative h-full z-40",
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              {/* Drag and drop overlay */}
              {isDragOver && !isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/5 backdrop-blur-sm">
                  <div className="text-center p-4 bg-muted/10 backdrop-blur-md rounded-lg border border-dashed border-muted-foreground/30">
                    <div className="text-2xl mb-2 opacity-50">📄</div>
                    <div className="text-sm text-muted-foreground">Drop files</div>
                  </div>
                </div>
              )}

              {/* Mode Banner */}
              <div className="px-4 pt-6 pb-2">
                <ChatModeBanner messageCount={messages.length} />
              </div>

              {/* Messages */}
              <div
                className={"flex flex-col gap-2 overflow-y-auto py-6 pb-96 z-10"}
                ref={containerRef}
                onScroll={handleScroll}
              >
                {messages.map((message, index) => {
                  const isLastMessage = messages.length - 1 === index;
                  return (
                    <PreviewMessage
                      threadId={threadId}
                      messageIndex={index}
                      prevMessage={messages[index - 1]}
                      key={message.id}
                      message={message}
                      status={status}
                      addToolResult={addToolResult}
                      isLoading={isLoading || isPendingToolCall}
                      isLastMessage={isLastMessage}
                      setMessages={setMessages}
                      sendMessage={sendMessage}
                      className={
                        isLastMessage &&
                        message.role != "user" &&
                        !space &&
                        message.parts.length > 1
                          ? "min-h-[calc(55dvh-40px)]"
                          : ""
                      }
                    />
                  );
                })}
                {space && (
                  <>
                    <div className="w-full mx-auto max-w-3xl px-6 relative">
                      <div className={space == "space" ? "opacity-0" : ""}>
                        <Think />
                      </div>
                    </div>
                    <div className="min-h-[calc(55dvh-56px)]" />
                  </>
                )}
                {error && <ErrorMessage error={error} />}
              </div>

              {/* Input and Controls */}
              <div className={clsx(messages.length && "absolute bottom-14", "w-full z-50")}>
                <div className="max-w-3xl mx-auto relative flex justify-center items-center -top-2">
                  <ScrollToBottomButton
                    show={!isAtBottom && messages.length > 0}
                    onClick={scrollToBottom}
                  />
                </div>

                {/* Preview Toggle Button - Coder Mode */}
                {activeArtifactId && (
                  <div className="max-w-3xl mx-auto px-4 mb-2">
                    <Button
                      onClick={() => setShowPreview(!showPreview)}
                      variant="ghost"
                      size="sm"
                      className="rounded-full shadow-lg backdrop-blur-sm bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all gap-2"
                    >
                      {showPreview ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          <span className="text-xs">Hide Preview</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          <span className="text-xs">Show Preview</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Context Limit Warning - Coder Mode */}
                {isContextLimitReached && (
                  <div className="max-w-3xl mx-auto px-4 mb-3">
                    <div className="rounded-xl shadow-lg backdrop-blur-sm bg-yellow-500/10 border border-yellow-500/30 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <span className="text-lg">⚠️</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                            Context Limit Exceeded
                          </h4>
                          <p className="text-xs text-yellow-600 dark:text-yellow-500">
                            The response was cut off due to context limits. Click continue to complete the component.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          console.log("[CODER MODE] Continue button clicked, current artifact:", activeArtifactId);
                          // Store the current artifact ID so we can merge the continuation
                          if (activeArtifactId) {
                            continuationArtifactIdRef.current = activeArtifactId;
                          }
                          sendMessage({
                            role: "user",
                            parts: [{ type: "text", text: "continue" }],
                          });
                          setIsContextLimitReached(false);
                        }}
                        size="sm"
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                      >
                        Continue Generation
                      </Button>
                    </div>
                  </div>
                )}

                {/* Beta Warning Banner - Coder Mode */}
                <div className="max-w-3xl mx-auto px-4 mb-2">
                  <div className="rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 px-3 py-2">
                    <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed">
                      {t("Coder.betaWarning")}
                    </p>
                  </div>
                </div>

                <PromptInput
                  input={input}
                  threadId={threadId}
                  sendMessage={sendMessage}
                  setInput={setInput}
                  isLoading={isLoading || isPendingToolCall}
                  onStop={stop}
                  onFocus={isFirstTime ? undefined : handleFocus}
                  model={model}
                  setModel={(newModel) =>
                    appStoreMutate((state) => ({ ...state, chatModel: newModel }))
                  }
                  fileAttachments={fileAttachments}
                  setFileAttachments={setFileAttachments}
                  isDragOver={isDragOver}
                  messageCount={messages.length}
                />

                {messages.length > 0 && (
                  <div className="max-w-3xl mx-auto px-4 mt-2 mb-4">
                    <p className="text-xs text-muted-foreground text-center">
                      {t("Chat.disclaimer")}
                    </p>
                  </div>
                )}
              </div>

              <DeleteThreadPopup
                threadId={threadId}
                onClose={() => setIsDeleteThreadPopupOpen(false)}
                open={isDeleteThreadPopupOpen}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            ref={previewPanelRef}
            defaultSize={0}
            minSize={30}
            maxSize={70}
            collapsible={true}
          >
            <PreviewPanel
              isStreaming={status === "streaming" || status === "submitted"}
              streamingContent={lastMessageContent}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div
          className={cn(
            emptyMessage && "justify-center pb-24",
            "flex flex-col min-w-0 relative h-full z-40",
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
        {/* Drag and drop overlay for the entire chat area */}
        {isDragOver && !isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/5 backdrop-blur-sm">
            <div className="text-center p-4 bg-muted/10 backdrop-blur-md rounded-lg border border-dashed border-muted-foreground/30">
              <div className="text-2xl mb-2 opacity-50">📄</div>
              <div className="text-sm text-muted-foreground">Drop files</div>
            </div>
          </div>
        )}
        {emptyMessage ? (
          <>
            <ChatGreeting />
          </>
        ) : (
          <>
            {/* Mode Banner - Show when in special mode and no messages yet */}
            <div className="px-4 pt-6 pb-2">
              <ChatModeBanner messageCount={messages.length} />
            </div>
            <div
              className={"flex flex-col gap-2 overflow-y-auto py-6 z-10"}
              ref={containerRef}
              onScroll={handleScroll}
            >
              {messages.map((message, index) => {
                const isLastMessage = messages.length - 1 === index;
                return (
                  <PreviewMessage
                    threadId={threadId}
                    messageIndex={index}
                    prevMessage={messages[index - 1]}
                    key={message.id}
                    message={message}
                    status={status}
                    addToolResult={addToolResult}
                    isLoading={isLoading || isPendingToolCall}
                    isLastMessage={isLastMessage}
                    setMessages={setMessages}
                    sendMessage={sendMessage}
                    className={
                      isLastMessage &&
                      message.role != "user" &&
                      !space &&
                      message.parts.length > 1
                        ? "min-h-[calc(55dvh-40px)]"
                        : ""
                    }
                  />
                );
              })}
              {space && (
                <>
                  <div className="w-full mx-auto max-w-3xl px-6 relative">
                    <div className={space == "space" ? "opacity-0" : ""}>
                      <Think />
                    </div>
                  </div>
                  <div className="min-h-[calc(55dvh-56px)]" />
                </>
              )}

              {error && <ErrorMessage error={error} />}
              <div className="min-w-0 min-h-64" />
            </div>
          </>
        )}

        <div
          className={clsx(
            messages.length && "absolute bottom-14",
            "w-full z-50",
          )}
        >
          <div className="max-w-3xl mx-auto relative flex justify-center items-center -top-2">
            <ScrollToBottomButton
              show={!isAtBottom && messages.length > 0}
              onClick={scrollToBottom}
            />
          </div>

          <PromptInput
            input={input}
            threadId={threadId}
            sendMessage={sendMessage}
            setInput={setInput}
            isLoading={isLoading || isPendingToolCall}
            onStop={stop}
            onFocus={isFirstTime ? undefined : handleFocus}
            model={model}
            setModel={(newModel) =>
              appStoreMutate((state) => ({ ...state, chatModel: newModel }))
            }
            fileAttachments={fileAttachments}
            setFileAttachments={setFileAttachments}
            isDragOver={isDragOver}
            messageCount={messages.length}
          />

          {/* Disclaimer - Show only if there are messages */}
          {messages.length > 0 && (
            <div className="max-w-3xl mx-auto px-4 mt-2 mb-4">
              <p className="text-xs text-muted-foreground text-center">
                {t("Chat.disclaimer")}
              </p>
            </div>
          )}
        </div>
        <DeleteThreadPopup
          threadId={threadId}
          onClose={() => setIsDeleteThreadPopupOpen(false)}
          open={isDeleteThreadPopupOpen}
        />
      </div>
      )}
    </>
  );
}

function DeleteThreadPopup({
  threadId,
  onClose,
  open,
}: { threadId: string; onClose: () => void; open: boolean }) {
  const t = useTranslations();
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    safe(() => deleteThreadAction(threadId))
      .watch(() => setIsDeleting(false))
      .ifOk(() => {
        toast.success(t("Chat.Thread.threadDeleted"));
        router.push("/");
      })
      .ifFail(() => toast.error(t("Chat.Thread.failedToDeleteThread")))
      .watch(() => onClose());
  }, [threadId, router]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Chat.Thread.deleteChat")}</DialogTitle>
          <DialogDescription>
            {t("Chat.Thread.areYouSureYouWantToDeleteThisChatThread")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("Common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} autoFocus>
            {t("Common.delete")}
            {isDeleting && <Loader className="size-3.5 ml-2 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
  className?: string;
}

function ScrollToBottomButton({
  show,
  onClick,
  className,
}: ScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={className}
        >
          <Button
            onClick={onClick}
            className="shadow-lg backdrop-blur-sm border transition-colors"
            size="icon"
            variant="ghost"
          >
            <ArrowDown />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
