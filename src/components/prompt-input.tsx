"use client";

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

import {
  ChevronDown,
  CornerRightUp,
  Square,
  XIcon,
  Mic,
  MicOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "ui/button";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { ChatMention, ChatModel } from "app-types/chat";
import dynamic from "next/dynamic";
import { ToolModeDropdown } from "./tool-mode-dropdown";

import { ToolSelectDropdown } from "./tool-select-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";
import { Editor } from "@tiptap/react";
import { WorkflowSummary } from "app-types/workflow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import equal from "lib/equal";
import { DefaultToolName } from "lib/ai/tools";
import { DefaultToolIcon } from "./default-tool-icon";
import { OpenAIIcon } from "ui/openai-icon";
import { GrokIcon } from "ui/grok-icon";
import { ClaudeIcon } from "ui/claude-icon";
import { GeminiIcon } from "ui/gemini-icon";

import { EMOJI_DATA } from "lib/const";
import { AgentSummary } from "app-types/agent";
import {
  FileAttachmentInput,
  AttachmentPreview,
  type AttachmentFile,
} from "./file-attachment";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: ChatModel;
  setModel?: (model: ChatModel) => void;
  voiceDisabled?: boolean;
  threadId?: string;
  disabledMention?: boolean;
  onFocus?: () => void;
  fileUploadDisabled?: boolean;
  fileAttachments?: AttachmentFile[];
  setFileAttachments?: (files: AttachmentFile[] | ((prev: AttachmentFile[]) => AttachmentFile[])) => void;
  isDragOver?: boolean;
}

const ChatMentionInput = dynamic(() => import("./chat-mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder,
  sendMessage,
  model,
  setModel,
  input,
  onFocus,
  setInput,
  onStop,
  isLoading,
  toolDisabled,
  voiceDisabled,
  threadId,
  disabledMention,
  fileUploadDisabled,
  fileAttachments: externalFileAttachments,
  setFileAttachments: externalSetFileAttachments,
  isDragOver: externalIsDragOver,
}: PromptInputProps) {
  const t = useTranslations("Chat");

  const [globalModel, threadMentions, appStoreMutate] = appStore(
    useShallow((state) => [
      state.chatModel,
      state.threadMentions,
      state.mutate,
    ]),
  );

  const [internalFileAttachments, setInternalFileAttachments] = useState<AttachmentFile[]>([]);
  const [isDictating, setIsDictating] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null,
  );

  // Use external props if provided, otherwise use internal state
  const fileAttachments = externalFileAttachments ?? internalFileAttachments;
  const setFileAttachments = externalSetFileAttachments ?? setInternalFileAttachments;
  const isDragOver = externalIsDragOver ?? false;

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      let processedCount = 0;

      recognitionInstance.onresult = (event) => {
        // Only process new final results
        for (let i = processedCount; i < event.results.length; i++) {
          if ((event.results[i] as any).isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) {
              const newInput = input
                ? `${input} ${transcript}`
                : transcript;
              setInput(newInput);
              processedCount = i + 1;
            }
          }
        }
      };

      (recognitionInstance as any).onstart = () => {
        processedCount = 0; // Reset when starting
      };

      recognitionInstance.onend = () => {
        setIsDictating(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsDictating(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [setInput]);

  const toggleDictation = useCallback(() => {
    if (!recognition) return;

    if (isDictating) {
      recognition.stop();
      setIsDictating(false);
    } else {
      recognition.start();
      setIsDictating(true);
    }
  }, [recognition, isDictating]);

  const mentions = useMemo<ChatMention[]>(() => {
    if (!threadId) return [];
    return threadMentions[threadId!] ?? [];
  }, [threadMentions, threadId]);

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

  const editorRef = useRef<Editor | null>(null);

  const setChatModel = useCallback(
    (model: ChatModel) => {
      if (setModel) {
        setModel(model);
      } else {
        appStoreMutate({ chatModel: model });
      }
    },
    [setModel, appStoreMutate],
  );

  const deleteMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        const newMentions = mentions.filter((m) => !equal(m, mention));
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const addMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        if (mentions.some((m) => equal(m, mention))) return prev;

        const newMentions =
          mention.type == "agent"
            ? [...mentions.filter((m) => m.type !== "agent"), mention]
            : [...mentions, mention];

        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onSelectWorkflow = useCallback(
    (workflow: WorkflowSummary) => {
      addMention({
        type: "workflow",
        name: workflow.name,
        icon: workflow.icon,
        workflowId: workflow.id,
        description: workflow.description,
      });
    },
    [addMention],
  );

  const onSelectAgent = useCallback(
    (agent: AgentSummary) => {
      appStoreMutate((prev) => {
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: [
              {
                type: "agent",
                name: agent.name,
                icon: agent.icon,
                description: agent.description,
                agentId: agent.id,
              },
            ],
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onChangeMention = useCallback(
    (mentions: ChatMention[]) => {
      let hasAgent = false;
      [...mentions]
        .reverse()
        .filter((m) => {
          if (m.type == "agent") {
            if (hasAgent) return false;
            hasAgent = true;
          }

          return true;
        })
        .reverse()
        .forEach(addMention);
    },
    [addMention],
  );

  const submit = () => {
    if (isLoading) return;

    // Stop dictation if it's running
    if (isDictating && recognition) {
      recognition.stop();
      setIsDictating(false);
    }

    const userMessage = input?.trim() || "";

    // Require either text input or file attachments
    if (userMessage.length === 0 && fileAttachments.length === 0) return;

    // Clear input and attachments first
    setInput("");
    setFileAttachments([]);

    // Send message with attachments as direct parts (working approach)
    sendMessage({
      role: "user",
      parts: [
        // Add file attachments as message parts FIRST
        ...fileAttachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.mediaType,
        })),
        // Then add text part
        {
          type: "text",
          text: userMessage,
        },
      ],
    });
  };

  // Handle file uploads
  const handleFilesSelected = useCallback((files: AttachmentFile[]) => {
    setFileAttachments((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFileAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);


  // Handle clipboard paste for images
  useEffect(() => {
    // Skip paste handling if file uploads are disabled
    if (fileUploadDisabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (imageItem) {
        e.preventDefault();
        e.stopPropagation();

        const file = imageItem.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              const attachmentFile: AttachmentFile = {
                type: "file",
                name: `pasted-image-${Date.now()}.${file.type.split("/")[1] || "png"}`,
                url: dataUrl,
                mediaType: file.type,
              };

              setFileAttachments((prev) => [...prev, attachmentFile]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };

    document.addEventListener("paste", handlePaste, true);
    return () => document.removeEventListener("paste", handlePaste, true);
  }, [fileUploadDisabled]);

  // Handle ESC key to clear mentions and files
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        (mentions.length > 0 || fileAttachments.length > 0) &&
        threadId
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (mentions.length > 0) {
          appStoreMutate((prev) => ({
            threadMentions: {
              ...prev.threadMentions,
              [threadId]: [],
            },
            agentId: undefined,
          }));
        }
        if (fileAttachments.length > 0) {
          setFileAttachments([]);
        }
        editorRef.current?.commands.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mentions.length, fileAttachments.length, threadId, appStoreMutate]);

  useEffect(() => {
    if (!editorRef.current) return;
  }, [editorRef.current]);

  return (
    <div className="max-w-3xl mx-auto fade-in animate-in">
      {/* File Attachments Preview - Above Input */}
      {fileAttachments.length > 0 && (
        <div className="mb-4 px-4">
          <div className="bg-background/80 backdrop-blur-md rounded-xl p-4 border shadow-lg">
            <div className="text-sm font-medium text-foreground mb-3">
              Attached Files ({fileAttachments.length})
            </div>
            <div className="flex flex-wrap gap-3">
              {fileAttachments.map((attachment, i) => (
                <AttachmentPreview
                  key={`${attachment.name}-${i}`}
                  attachment={attachment}
                  onRemove={() => handleRemoveFile(i)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="z-10 mx-auto w-full max-w-3xl relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-4">
          <div className="shadow-lg overflow-hidden rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/60 relative flex w-full flex-col cursor-text z-10 items-stretch focus-within:bg-muted hover:bg-muted focus-within:ring-muted hover:ring-muted">
            {mentions.length > 0 && (
              <div className="bg-input rounded-b-sm rounded-t-3xl p-3 mx-2 my-2">
                <div className="flex flex-col gap-4">
                  {mentions.map((mention, i) => {
                    return (
                      <div key={i} className="flex items-center gap-2">
                        {mention.type === "workflow" ||
                        mention.type === "agent" ? (
                          <Avatar
                            className="size-6 p-1 ring ring-border rounded-full flex-shrink-0"
                            style={mention.icon?.style}
                          >
                            <AvatarImage
                              src={
                                mention.icon?.value ||
                                EMOJI_DATA[i % EMOJI_DATA.length]
                              }
                            />
                            <AvatarFallback>
                              {mention.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Button className="size-6 flex items-center justify-center ring ring-border rounded-full flex-shrink-0 p-0.5">
                            <DefaultToolIcon
                              name={mention.name as DefaultToolName}
                              className="size-3.5"
                            />
                          </Button>
                        )}

                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-semibold truncate">
                            {mention.name}
                          </span>
                          {mention.description ? (
                            <span className="text-muted-foreground text-xs truncate">
                              {mention.description}
                            </span>
                          ) : null}
                        </div>
                        <Button
                          variant={"ghost"}
                          size={"icon"}
                          disabled={!threadId}
                          className="rounded-full hover:bg-input! flex-shrink-0"
                          onClick={() => {
                            deleteMention(mention);
                          }}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3.5 px-5 pt-2 pb-4">
              <div className="relative min-h-[2rem]">
                <ChatMentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={onChangeMention}
                  onEnter={submit}
                  placeholder={placeholder ?? t("placeholder")}
                  ref={editorRef}
                  disabledMention={disabledMention}
                  onFocus={onFocus}
                />
              </div>
              <div className="flex w-full items-center z-30">
                {!fileUploadDisabled && (
                  <FileAttachmentInput
                    onFilesSelected={handleFilesSelected}
                    disabled={isLoading}
                  />
                )}

                {!toolDisabled && (
                  <>
                    <ToolModeDropdown />
                    {false && (
                      <ToolSelectDropdown
                        className="mx-1"
                        align="start"
                        side="top"
                        onSelectWorkflow={onSelectWorkflow}
                        onSelectAgent={onSelectAgent}
                        mentions={mentions}
                      />
                    )}
                  </>
                )}

                <div className="flex-1" />

                {setModel && (
                  <SelectModel onSelect={setChatModel} currentModel={chatModel}>
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="rounded-full group data-[state=open]:bg-input! hover:bg-input! mr-1"
                    data-testid="model-selector-button"
                  >
                    <img
                      src="/uvala-white-log.svg"
                      alt="Uvala"
                      className="size-4 opacity-100 group-data-[state=open]:opacity-50 group-hover:opacity-50 mr-1"
                    />
                    {chatModel?.model ? (
                      <>
                        {chatModel.provider === "openai" ? (
                          <OpenAIIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "xai" ? (
                          <GrokIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "anthropic" ? (
                          <ClaudeIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "google" ? (
                          <GeminiIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : null}
                        <span
                          className="text-foreground group-data-[state=open]:text-foreground  "
                          data-testid="selected-model-name"
                        >
                          {chatModel.model}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">model</span>
                    )}

                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>
                )}
                {!isLoading &&
                !input.length &&
                fileAttachments.length === 0 &&
                !voiceDisabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size={"sm"}
                        onClick={toggleDictation}
                        className={`rounded-full p-2! ${isDictating ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                        disabled={!recognition}
                      >
                        {isDictating ? <MicOff size={16} /> : <Mic size={16} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {recognition
                        ? isDictating
                          ? "Stop Dictation"
                          : "Start Dictation"
                        : "Dictation not supported"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div
                    onClick={() => {
                      if (isLoading) {
                        onStop();
                      } else {
                        submit();
                      }
                    }}
                    className="fade-in animate-in cursor-pointer text-muted-foreground rounded-full p-2 bg-secondary hover:bg-accent-foreground hover:text-accent transition-all duration-200"
                  >
                    {isLoading ? (
                      <Square
                        size={16}
                        className="fill-muted-foreground text-muted-foreground"
                      />
                    ) : (
                      <CornerRightUp size={16} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
