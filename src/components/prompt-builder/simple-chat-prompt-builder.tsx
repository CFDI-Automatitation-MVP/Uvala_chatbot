"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { Button } from "ui/button";
import { PreviewMessage, ErrorMessage } from "../message";
import PromptInput from "../prompt-input";
import { Think } from "ui/think";
import { cn } from "lib/utils";
import { Copy, RotateCcw, Brain } from "lucide-react";
import { useTranslations } from "next-intl";

export function SimpleChatPromptBuilder() {
  const t = useTranslations("PromptBuilder");
  const [_promptBuilder, appStoreMutate] = appStore(
    useShallow((state) => [state.promptBuilder, state.mutate]),
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
      api: "/api/chat/prompt-builder",
      prepareSendMessagesRequest: ({ messages }) => {
        const promptBuilderState = appStore.getState().promptBuilder;
        return {
          body: {
            chatModel: promptBuilderState.chatModel,
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

  // Force uvala-fuji-micro model for prompt builder
  useEffect(() => {
    appStoreMutate((state) => ({
      promptBuilder: {
        ...state.promptBuilder,
        chatModel: {
          provider: "Internal",
          model: "uvala-fuji-micro",
        },
      },
    }));
  }, [appStoreMutate]);

  const resetChat = () => {
    setMessages([]);
    clearError();
    setInput("");
  };

  const copyLastAssistantMessage = () => {
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find((msg) => msg.role === "assistant");

    if (lastAssistantMessage && "content" in lastAssistantMessage) {
      const content =
        typeof (lastAssistantMessage as any).content === "string"
          ? (lastAssistantMessage as any).content
          : JSON.stringify((lastAssistantMessage as any).content);
      navigator.clipboard.writeText(content);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with buttons */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={copyLastAssistantMessage}
              title={t("copyLastResponse")}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetChat}
              title={t("resetChat")}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={cn("flex flex-col min-w-0 h-full flex-1 overflow-y-hidden")}
      >
        {!messages.length && !error && (
          <div className="flex-1 items-center flex">
            <div className="max-w-3xl mx-auto my-4 p-6">
              <div className="rounded-xl p-6 flex flex-col gap-2 leading-relaxed text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">
                  {t("aiPromptBuilder")}
                </h1>
                <p className="text-muted-foreground mb-4">{t("description")}</p>
                <div className="text-left space-y-2 text-sm">
                  <p className="font-medium">{t("examples")}:</p>
                  <div className="bg-muted rounded-lg p-3 space-y-1">
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
          className={"flex flex-col gap-2 overflow-y-auto py-6"}
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
            <div className="w-full mx-auto max-w-3xl px-6">
              <Think />
            </div>
          )}
          {error && <ErrorMessage error={error} />}
        </div>

        <div className={"w-full my-6 mt-auto"}>
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
