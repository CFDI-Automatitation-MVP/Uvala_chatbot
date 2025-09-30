"use client";

// Optimized direct Web Speech API implementation

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

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

import ToolSelectDropdown from "./tool-select-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";
import { Editor } from "@tiptap/react";
import { WorkflowSummary } from "app-types/workflow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import Image from "next/image";
import equal from "lib/equal";
import { DefaultToolName } from "lib/ai/tools";
import { DefaultToolIcon } from "./default-tool-icon";
import { OpenAIIcon } from "ui/openai-icon";
import { GrokIcon } from "ui/grok-icon";
import { ClaudeIcon } from "ui/claude-icon";
import { GeminiIcon } from "ui/gemini-icon";
import useSWR from "swr";
import { COOKIE_KEY_LOCALE } from "@/lib/const";
import { getLocaleAction } from "@/i18n/get-locale";

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
  setFileAttachments?: (
    files: AttachmentFile[] | ((prev: AttachmentFile[]) => AttachmentFile[]),
  ) => void;
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
  fileUploadDisabled,
  fileAttachments: externalFileAttachments,
  setFileAttachments: externalSetFileAttachments,
  isDragOver: _externalIsDragOver,
}: PromptInputProps) {
  const t = useTranslations("Chat");

  const [globalModel, threadMentions, appStoreMutate] = appStore(
    useShallow((state) => [
      state.chatModel,
      state.threadMentions,
      state.mutate,
    ]),
  );

  const [internalFileAttachments, setInternalFileAttachments] = useState<
    AttachmentFile[]
  >([]);

  // Get current app locale
  const { data: currentLocale } = useSWR(COOKIE_KEY_LOCALE, getLocaleAction, {
    fallbackData: "es", // Default to Spanish
    revalidateOnFocus: false,
  });

  // Optimal Speech Recognition Implementation
  const [speechLanguage, setSpeechLanguage] = useState<"es-ES" | "en-US">(
    "es-ES",
  );
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "checking"
  >("checking");
  const [isHttps, setIsHttps] = useState(true);

  // Initialize optimal speech recognition
  useEffect(() => {
    if (typeof window === "undefined") {
      console.log("🚫 Window undefined, skipping speech init");
      return;
    }

    // Check HTTPS requirement
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    setIsHttps(isSecure);

    if (!isSecure) {
      console.error(
        "❌ HTTPS required for speech recognition. Current protocol:",
        window.location.protocol,
      );
      setSpeechSupported(false);
      return;
    }

    console.log("🎤 Initializing speech recognition...");
    console.log("🔒 Protocol:", window.location.protocol);
    console.log("🌐 Hostname:", window.location.hostname);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log("🚫 Speech Recognition API not available in this browser");
      setSpeechSupported(false);
      setPermissionState("denied");
      return;
    }

    console.log("✅ Speech Recognition API available");
    setSpeechSupported(true);
    setPermissionState("prompt");
    const recognition = new SpeechRecognition();

    // Professional configuration based on Google's demo
    recognition.continuous = true; // Keep listening for better dictation
    recognition.interimResults = true; // Show interim results for better UX
    recognition.maxAlternatives = 1; // Single best result

    // Use app's selected language, fallback to browser detection
    const appLang = currentLocale || "es";
    const initialLang =
      appLang === "es"
        ? "es-ES"
        : appLang === "en"
          ? "en-US"
          : appLang === "fr"
            ? "fr-FR"
            : appLang === "ja"
              ? "ja-JP"
              : "es-ES";

    recognition.lang = initialLang;
    setSpeechLanguage(initialLang as "es-ES" | "en-US");
    console.log(`🌐 Speech initialized: ${initialLang} (app: ${appLang})`);

    recognition.onstart = () => {
      setIsDictating(true);
      setPermissionState("granted");
      console.log(
        `✅ Speech recognition started successfully in ${recognition.lang}`,
      );
      console.log("🎤 Now listening... Speak into your microphone");
    };

    recognition.onend = () => {
      setIsDictating(false);
      console.log("🎤 Speech recognition ended");
      // Auto-restart if continuous mode is enabled and still supposed to be listening
      if (recognition.continuous && isDictating) {
        console.log("🔄 Auto-restarting continuous recognition");
        try {
          recognition.start();
        } catch (e) {
          console.log("Could not auto-restart:", e);
        }
      }
    };

    recognition.onresult = (event: any) => {
      console.log("📥 Received speech results, processing...");
      let _interimTranscript = "";
      let finalTranscript = "";

      // Process all results (handles both interim and final)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
          const confidence = result[0].confidence || 0;
          console.log(
            `🎯 Final transcript: "${transcript}" (confidence: ${Math.round(confidence * 100)}%)`,
          );
        } else {
          _interimTranscript += transcript;
          console.log(`💬 Interim: "${transcript}"`);
        }
      }

      // Update input with final results
      if (finalTranscript) {
        const currentText = input.trim();
        const newInput = currentText
          ? `${currentText} ${finalTranscript.trim()}`
          : finalTranscript.trim();
        setInput(newInput);
        console.log(`✍️ Updated input: "${newInput}"`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Speech recognition error:", event.error);
      console.error("Error details:", event);
      setIsDictating(false);

      // Handle specific errors with user-friendly messages
      if (event.error === "no-speech") {
        console.warn("⚠️ No speech detected. Try speaking again.");
        return;
      }

      if (event.error === "audio-capture") {
        console.error(
          "🎤 No microphone found or microphone is being used by another application",
        );
        setPermissionState("denied");
        return;
      }

      if (event.error === "not-allowed") {
        console.error(
          "🚫 Microphone permission denied. Please allow microphone access in your browser settings.",
        );
        setPermissionState("denied");
        // Check if it's initial permission denial or subsequent
        if (event.timeStamp - recognition.startTimestamp < 100) {
          console.error("Permission was denied before recognition started");
        } else {
          console.error("Permission was denied after starting");
        }
        return;
      }

      if (event.error === "aborted") {
        console.log("Speech recognition was aborted");
        return;
      }

      // Log any other errors
      console.error(`Unhandled error type: ${event.error}`);
    };

    recognition.onnomatch = () => {
      console.log("🚫 No speech match found");
    };

    setSpeechRecognition(recognition);

    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [currentLocale]); // Re-initialize when language changes

  const _startListening = useCallback(() => {
    console.log("🔘 startListening() called");
    console.log("📊 State check:", {
      speechSupported,
      speechRecognition: !!speechRecognition,
      isDictating,
      permissionState,
      isHttps,
    });

    if (!isHttps) {
      console.error("❌ Cannot start: HTTPS required for speech recognition");
      alert(
        "Speech recognition requires HTTPS. Please access this site via https://",
      );
      return;
    }

    if (!speechSupported) {
      console.error("❌ Cannot start: Speech recognition not supported");
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.",
      );
      return;
    }

    if (!speechRecognition) {
      console.error("❌ Cannot start: Speech recognition not initialized");
      return;
    }

    if (isDictating) {
      console.log("⚠️ Already dictating, ignoring start request");
      return;
    }

    try {
      // Update language before starting
      speechRecognition.lang = speechLanguage;
      console.log("🚀 Attempting to start speech recognition...");
      console.log(`🌐 Language: ${speechLanguage}`);
      console.log(
        "⚡ Calling speechRecognition.start() - Permission prompt should appear now if not granted",
      );

      // Store timestamp for error detection
      speechRecognition.startTimestamp = Date.now();
      speechRecognition.start();

      console.log(
        "✅ speechRecognition.start() called successfully. Waiting for permission...",
      );
    } catch (error: any) {
      console.error("❌ Exception when starting speech recognition:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      if (
        error.message?.includes("already started") ||
        error.name === "InvalidStateError"
      ) {
        console.log("🔄 Recognition already started, stopping and restarting");
        speechRecognition.stop();
        setTimeout(() => {
          try {
            console.log("🔄 Retry: calling start() again");
            speechRecognition.start();
          } catch (retryError) {
            console.error("❌ Failed to restart:", retryError);
          }
        }, 100);
      } else {
        alert(
          `Failed to start speech recognition: ${error.message}\n\nPlease check:\n1. Microphone permissions\n2. Browser compatibility\n3. HTTPS connection`,
        );
      }
      setIsDictating(false);
    }
  }, [
    speechRecognition,
    isDictating,
    speechSupported,
    speechLanguage,
    permissionState,
    isHttps,
  ]);

  const stopListening = useCallback(() => {
    if (speechRecognition && isDictating) {
      speechRecognition.stop();
    }
  }, [speechRecognition, isDictating]);

  // Use external props if provided, otherwise use internal state
  const fileAttachments = externalFileAttachments ?? internalFileAttachments;
  const setFileAttachments =
    externalSetFileAttachments ?? setInternalFileAttachments;

  const toggleDictation = useCallback(() => {
    console.log("🔘 toggleDictation called");

    if (!isHttps) {
      console.error("❌ Cannot toggle: HTTPS required");
      alert(
        "Speech recognition requires HTTPS. Please access this site via https://",
      );
      return;
    }

    if (!speechSupported) {
      console.error("❌ Cannot toggle: Speech recognition not supported");
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.",
      );
      return;
    }

    if (!speechRecognition) {
      console.error("❌ Cannot toggle: Speech recognition not initialized");
      return;
    }

    // Stop if already dictating
    if (isDictating) {
      console.log("🛑 Stopping dictation");
      speechRecognition.stop();
      return;
    }

    // Start dictation - MUST be synchronous for Chrome user gesture
    console.log("🚀 Starting dictation synchronously");
    try {
      speechRecognition.lang = speechLanguage;
      console.log(`🌐 Language: ${speechLanguage}`);
      console.log("⚡ Calling start() SYNCHRONOUSLY in user gesture context");

      speechRecognition.startTimestamp = Date.now();
      speechRecognition.start(); // This MUST happen synchronously!

      console.log("✅ start() called - waiting for permission/onstart event");
    } catch (error: any) {
      console.error("❌ Exception in toggleDictation:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);

      if (
        error.message?.includes("already started") ||
        error.name === "InvalidStateError"
      ) {
        console.log("🔄 Already started, stopping and retrying");
        speechRecognition.stop();
        setTimeout(() => {
          try {
            speechRecognition.start();
          } catch (retryError) {
            console.error("❌ Retry failed:", retryError);
          }
        }, 100);
      } else {
        alert(
          `Failed to start speech recognition: ${error.message}\n\nPlease check:\n1. Microphone permissions in browser settings\n2. Browser compatibility (Chrome, Edge, Safari)\n3. HTTPS connection`,
        );
      }
      setIsDictating(false);
    }
  }, [
    isDictating,
    speechSupported,
    speechRecognition,
    speechLanguage,
    isHttps,
  ]);

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
    if (isDictating) {
      stopListening();
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
                  disabledMention={true}
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
                      <Image
                        src="/uvala-white-log.svg"
                        alt="Uvala"
                        width={16}
                        height={16}
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
                {/* Dictation Button - Show when voice is enabled and not loading */}
                {!isLoading && !voiceDisabled && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size={"sm"}
                        onClick={(e) => {
                          console.log("🖱️ Microphone button clicked!", e);
                          toggleDictation();
                        }}
                        className={`rounded-full p-2! mr-2 ${
                          isDictating
                            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                            : permissionState === "denied"
                              ? "opacity-50"
                              : ""
                        }`}
                        disabled={!speechSupported || !isHttps}
                      >
                        {isDictating ? <MicOff size={16} /> : <Mic size={16} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!isHttps
                        ? "🔒 HTTPS required for speech recognition"
                        : !speechSupported
                          ? "Speech recognition not supported in this browser. Use Chrome, Edge, or Safari."
                          : permissionState === "denied"
                            ? "🚫 Microphone access denied. Please enable in browser settings."
                            : isDictating
                              ? `🔴 Stop Dictation (${speechLanguage === "es-ES" ? "Español" : "English"})`
                              : `🎤 Start Dictation (${speechLanguage === "es-ES" ? "Español" : "English"})`}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Send/Stop Button - Show when there's content or when loading */}
                {(input.length > 0 ||
                  fileAttachments.length > 0 ||
                  isLoading) && (
                  <div
                    onClick={() => {
                      if (isLoading) {
                        onStop();
                      } else {
                        submit();
                      }
                    }}
                    className="fade-in animate-in cursor-pointer text-white rounded-full p-2 bg-blue-500 hover:bg-blue-600 border-2 border-blue-400 transition-all duration-200 shadow-lg"
                  >
                    {isLoading ? (
                      <Square size={16} className="fill-white text-white" />
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
