export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type AssistantChat = {
  id: string;
  title: string;
  tenderId: string;
  messages: AssistantChatMessage[];
  updatedAt: string;
};

const STORAGE_KEY = "procura_assistant_chats_v1";
const MAX_CHATS = 40;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadAssistantChats(): AssistantChat[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssistantChat[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((chat) => chat?.id && Array.isArray(chat.messages));
  } catch {
    return [];
  }
}

export function saveAssistantChats(chats: AssistantChat[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)));
}

export function upsertAssistantChat(chat: AssistantChat): AssistantChat[] {
  const existing = loadAssistantChats().filter((item) => item.id !== chat.id);
  const next = [chat, ...existing].slice(0, MAX_CHATS);
  saveAssistantChats(next);
  return next;
}

export function deleteAssistantChat(id: string): AssistantChat[] {
  const next = loadAssistantChats().filter((item) => item.id !== id);
  saveAssistantChats(next);
  return next;
}

export function chatTitleFromTender(title: string | null | undefined) {
  return shortChatTitle(title);
}

/** Short label for the history list, still identifiable from the tender name. */
export function shortChatTitle(title: string | null | undefined) {
  let text = title?.trim() || "Untitled procurement";
  text = text.replace(
    /^(procurement\s+and\s+supply\s+of|procurement\s+and\s+installation\s+of|procurement\s+of|supply\s+and\s+installation\s+of|supply\s+of|invitation\s+for\s+|request\s+for\s+)\s*/i,
    "",
  );
  text = text.replace(/\s+/g, " ").trim();
  if (!text) text = title?.trim() || "Untitled procurement";
  if (text.length > 32) {
    text = `${text.slice(0, 29).trimEnd()}…`;
  }
  return text;
}
