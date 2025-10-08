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
import { Code } from "lucide-react";
import { useTranslations } from "next-intl";

export function SimpleChatCoder() {
  const t = useTranslations("Coder");
  const [_coder, appStoreMutate] = appStore(
    useShallow((state) => [state.coder, state.mutate]),
  );

  const [input, setInput] = useState("");

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

  // Force qwen3-coder-30b model for coder
  useEffect(() => {
    appStoreMutate((state) => ({
      coder: {
        ...state.coder,
        chatModel: {
          provider: "Internal",
          model: "qwen3-coder-30b",
        },
      },
    }));
  }, [appStoreMutate]);

  const resetChat = useCallback(() => {
    setMessages([]);
    clearError();
    setInput("");
  }, [setMessages, clearError, setInput]);

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

  return (
    <div className="h-full flex flex-col">
      {/* Chat Area */}
      <div
        className={cn("flex flex-col min-w-0 h-full flex-1 overflow-y-hidden")}
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

        <div className={"w-full my-3 md:my-6 mt-auto px-2 md:px-0"}>
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
  );
}
