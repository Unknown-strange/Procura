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
  const trimmed = title?.trim();
  return trimmed || "Untitled procurement";
}
