"use client";

import dynamic from "next/dynamic";

const KeyboardShortcutsPopup = dynamic(
  () =>
    import("@/components/keyboard-shortcuts-popup").then(
      (mod) => mod.KeyboardShortcutsPopup,
    ),
  {
    ssr: false,
  },
);

const ChatPreferencesPopup = dynamic(
  () =>
    import("@/components/chat-preferences-popup").then(
      (mod) => mod.ChatPreferencesPopup,
    ),
  {
    ssr: false,
  },
);

const ChatBotVoice = dynamic(
  () => import("@/components/chat-bot-voice").then((mod) => mod.ChatBotVoice),
  {
    ssr: false,
  },
);

const ChatBotTemporary = dynamic(
  () =>
    import("@/components/chat-bot-temporary").then(
      (mod) => mod.ChatBotTemporary,
    ),
  {
    ssr: false,
  },
);

const PromptBuilderPopup = dynamic(
  () =>
    import("@/components/prompt-builder-popup").then(
      (mod) => mod.PromptBuilderPopup,
    ),
  {
    ssr: false,
  },
);

const CoderPopup = dynamic(
  () => import("@/components/coder-popup").then((mod) => mod.CoderPopup),
  {
    ssr: false,
  },
);

const LearnPopup = dynamic(
  () => import("@/components/learn-popup").then((mod) => mod.LearnPopup),
  {
    ssr: false,
  },
);

export function AppPopupProvider() {
  return (
    <>
      <KeyboardShortcutsPopup />
      <ChatPreferencesPopup />
      {/* Voice chat functionality is hidden */}
      {false && <ChatBotVoice />}
      <ChatBotTemporary />
      <PromptBuilderPopup />
      <CoderPopup />
      <LearnPopup />
    </>
  );
}
