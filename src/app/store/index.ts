import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ChatMention, ChatModel, ChatThread } from "app-types/chat";
import { OPENAI_VOICE } from "lib/ai/speech/open-ai/use-voice-chat.openai";
import { WorkflowSummary } from "app-types/workflow";
import { AppDefaultToolkit } from "lib/ai/tools";
import { AgentSummary } from "app-types/agent";
import { ArchiveWithItemCount } from "app-types/archive";

export type ChatMode = "normal" | "coder" | "promptBuilder" | "learn";

export interface AppState {
  threadList: ChatThread[];
  agentList: AgentSummary[];
  workflowToolList: WorkflowSummary[];
  currentThreadId: ChatThread["id"] | null;
  toolChoice: "auto" | "none" | "manual";
  allowedAppDefaultToolkit?: AppDefaultToolkit[];
  generatingTitleThreadIds: string[];
  archiveList: ArchiveWithItemCount[];
  threadMentions: {
    [threadId: string]: ChatMention[];
  };
  toolPresets: {
    allowedAppDefaultToolkit?: AppDefaultToolkit[];
    name: string;
  }[];
  chatModel?: ChatModel;
  chatMode: ChatMode;
  openShortcutsPopup: boolean;
  openChatPreferences: boolean;
  temporaryChat: {
    isOpen: boolean;
    instructions: string;
    chatModel?: ChatModel;
  };
  promptBuilder: {
    isOpen: boolean;
    chatModel?: ChatModel;
  };
  coder: {
    isOpen: boolean;
    chatModel?: ChatModel;
  };
  learn: {
    isOpen: boolean;
    chatModel?: ChatModel;
  };
  voiceChat: {
    isOpen: boolean;
    agentId?: string;
    options: {
      provider: string;
      providerOptions?: Record<string, any>;
    };
  };
  pendingThreadMention?: ChatMention;
  profileDropdownOpen: boolean;
  threadDropdownOpen: boolean;
}

export interface AppDispatch {
  mutate: (
    state: Partial<AppState> | ((state: AppState) => Partial<AppState>),
  ) => void;
}

const initialState: AppState = {
  threadList: [],
  archiveList: [],
  generatingTitleThreadIds: [],
  threadMentions: {},
  agentList: [],
  workflowToolList: [],
  currentThreadId: null,
  toolChoice: "auto", // Default: Tools ON
  allowedAppDefaultToolkit: [
    AppDefaultToolkit.Visualization,
    AppDefaultToolkit.WebSearch,
    AppDefaultToolkit.ImageGeneration,
    AppDefaultToolkit.VideoGeneration,
    // WebSandbox is hidden
  ],
  toolPresets: [],
  chatModel: {
    provider: "Fast & Direct",
    model: "uvala-fuji",
  },
  chatMode: "normal",
  openShortcutsPopup: false,
  openChatPreferences: false,
  temporaryChat: {
    isOpen: false,
    instructions: "",
  },
  promptBuilder: {
    isOpen: false,
  },
  coder: {
    isOpen: false,
  },
  learn: {
    isOpen: false,
  },
  voiceChat: {
    isOpen: false,
    options: {
      provider: "openai",
      providerOptions: {
        model: OPENAI_VOICE["Alloy"],
      },
    },
  },
  pendingThreadMention: undefined,
  profileDropdownOpen: false,
  threadDropdownOpen: false,
};

export const appStore = create<AppState & AppDispatch>()(
  persist(
    (set) => ({
      ...initialState,
      mutate: set,
    }),
    {
      name: "mc-app-store-v2.0.1",
      partialize: (state) => ({
        chatModel: state.chatModel || initialState.chatModel,
        chatMode: state.chatMode || initialState.chatMode,
        toolChoice: state.toolChoice || initialState.toolChoice,
        allowedAppDefaultToolkit: (
          state.allowedAppDefaultToolkit ??
          initialState.allowedAppDefaultToolkit
        )?.filter((v) => Object.values(AppDefaultToolkit).includes(v)),
        temporaryChat: {
          ...initialState.temporaryChat,
          ...state.temporaryChat,
          isOpen: false,
        },
        promptBuilder: {
          chatModel: state.promptBuilder?.chatModel || state.chatModel,
          isOpen: false,
        },
        learn: {
          chatModel: state.learn?.chatModel || state.chatModel,
          isOpen: false,
        },
        toolPresets: state.toolPresets || initialState.toolPresets,
        voiceChat: {
          ...initialState.voiceChat,
          ...state.voiceChat,
          isOpen: false,
        },
      }),
    },
  ),
);
