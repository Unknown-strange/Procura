"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileSearch,
  FileText,
  FolderCog,
  History,
  Lightbulb,
  Lock,
  Paperclip,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { ChatMarkdown } from "@/components/assistant/chat-markdown";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import {
  chatTitleFromTender,
  deleteAssistantChat,
  loadAssistantChats,
  shortChatTitle,
  upsertAssistantChat,
  type AssistantChat,
  type AssistantChatMessage,
} from "@/lib/assistant-chats";
import { createClient } from "@/lib/supabase/client";
import { ghanepsTenderUrl } from "@/lib/ghaneps";
import { formatRelativeTime } from "@/lib/utils";
import {
  DOC_ACCEPT,
  TYPICAL_TENDER_DOCUMENTS,
  type UserDocument,
  documentsPromptBlock,
  listUserDocuments,
  uploadUserDocument,
} from "@/lib/documents";

type TenderOption = {
  id: string;
  title: string;
  procurement_type: string | null;
  procuring_entity_name: string | null;
  source_url: string | null;
  ghaneps_id: string | null;
};

type ChatMessage = AssistantChatMessage;

const EMPTY_ASSISTANT =
  "Start with **Documents Needed**, then upload a tender PDF if you want analysis.";

function newMessageId() {
  return crypto.randomUUID();
}

function AssistantInner() {
  const searchParams = useSearchParams();
  const requestedTender = searchParams.get("tender") ?? "";
  const [tenders, setTenders] = useState<TenderOption[]>([]);
  const [tenderId, setTenderId] = useState(requestedTender);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [readyPercent, setReadyPercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUploadName, setLastUploadName] = useState<string | null>(null);
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [ghanepsUrl, setGhanepsUrl] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [chats, setChats] = useState<AssistantChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"check" | "missing" | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const activeChatIdRef = useRef<string | null>(null);

  const hasUploads = docs.length > 0;
  const canAsk = Boolean(draft.trim()) && !loading;
  const hasChat = messages.length > 0;

  const tender = useMemo(
    () => tenders.find((t) => t.id === tenderId) ?? tenders[0] ?? null,
    [tenders, tenderId],
  );

  const displayMessages = messages.length
    ? messages
    : [{ id: "empty", role: "assistant" as const, content: EMPTY_ASSISTANT }];

  const refreshDocs = useCallback(async () => {
    const result = await listUserDocuments();
    setDocs(result.docs);
  }, []);

  useEffect(() => {
    void refreshDocs();
  }, [refreshDocs]);

  useEffect(() => {
    setChats(loadAssistantChats());
  }, []);

  function scrollThreadToBottom() {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottom.current = true;
    setShowJump(false);
  }

  function onThreadScroll() {
    const el = threadRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    stickToBottom.current = nearBottom;
    setShowJump(!nearBottom);
  }

  useEffect(() => {
    if (stickToBottom.current) scrollThreadToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("tenders")
          .select("id, title, procurement_type, source_url, ghaneps_id, procuring_entities ( name )")
          .in("status", ["open", "closing_soon"])
          .order("submission_deadline", { ascending: true })
          .limit(50);
        if (cancelled) return;
        const mapped: TenderOption[] = (data ?? []).map((row) => {
          const entityRaw = row.procuring_entities as
            | { name: string }
            | { name: string }[]
            | null;
          const entity = Array.isArray(entityRaw) ? entityRaw[0] : entityRaw;
          return {
            id: row.id,
            title: row.title,
            procurement_type: row.procurement_type,
            procuring_entity_name: entity?.name ?? null,
            source_url: row.source_url,
            ghaneps_id: row.ghaneps_id,
          };
        });
        setTenders(mapped);
        const selected =
          mapped.find((t) => t.id === requestedTender) ?? mapped[0] ?? null;
        if (selected) {
          setTenderId(selected.id);
          setGhanepsUrl(
            ghanepsTenderUrl({
              source_url: selected.source_url,
              ghaneps_id: selected.ghaneps_id,
            }),
          );
        }
      } catch {
        if (!cancelled) setTenders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedTender]);

  async function getAccessToken() {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  async function callAi(path: string, body: Record<string, unknown>) {
    const token = await getAccessToken();
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base || base.includes("your-project") || !token) return null;
    const res = await fetch(`${base}/functions/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function answerFromRemote(
    remote: { content?: string; error?: string; message?: string } | null,
    fallback: string,
  ) {
    if (remote?.error) {
      return `Could not get an AI answer: ${remote.error}`;
    }
    if (remote?.content?.trim()) return remote.content;
    if (remote?.message?.trim()) return remote.message;
    return fallback;
  }

  function resolveGhaneps(
    remoteUrl?: string | null,
    fallback?: { source_url?: string | null; ghaneps_id?: string | null } | null,
  ) {
    return ghanepsTenderUrl({
      source_url: remoteUrl ?? fallback?.source_url,
      ghaneps_id: fallback?.ghaneps_id,
    });
  }

  function documentPayload(selected?: UserDocument[]) {
    const source = selected ?? docs;
    if (!source.length) return [];
    return source.map((d) => ({
      id: d.id,
      title: d.title,
      document_type: d.document_type,
      status: d.status,
      extracted_text: d.extracted_text?.slice(0, 2500) ?? null,
    }));
  }

  function neededDocsFallback() {
    const type = tender?.procurement_type ?? "Goods";
    return `For a ${type} tender like “${tender?.title}”, we assume your company registration, GRA tax clearance, SSNIT clearance, and financial statements are already in order. Do not upload those here.

Procura helps with the tender pack itself:

1. Tender-specific forms from the GHANEPS bidding pack
2. Technical proposal or completed schedules, if the IFB asks for them
3. Evidence of similar experience, if requested
4. Bid security, only if this notice requires it

Upload the tender document (or other working files) if you want the AI to analyze that pack. Official bidding stays on GHANEPS.`;
  }

  function persistCurrent(nextMessages: ChatMessage[]) {
    if (!nextMessages.length) return;
    const id = activeChatIdRef.current ?? crypto.randomUUID();
    activeChatIdRef.current = id;
    setActiveChatId(id);
    setChats(
      upsertAssistantChat({
        id,
        title: chatTitleFromTender(tender?.title),
        tenderId: tenderId || tender?.id || "",
        messages: nextMessages,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function startNewChat() {
    setMessages([]);
    setDraft("");
    setStatusMessage("");
    setReadyPercent(null);
    stickToBottom.current = true;
    setShowJump(false);
    activeChatIdRef.current = null;
    setActiveChatId(null);
    setHistoryOpen(false);
  }

  function openSavedChat(chat: AssistantChat) {
    activeChatIdRef.current = chat.id;
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setTenderId(chat.tenderId);
    const t = tenders.find((x) => x.id === chat.tenderId);
    setGhanepsUrl(
      t
        ? ghanepsTenderUrl({ source_url: t.source_url, ghaneps_id: t.ghaneps_id })
        : ghanepsUrl,
    );
    setDraft("");
    setStatusMessage("");
    setReadyPercent(null);
    setHistoryOpen(false);
    stickToBottom.current = true;
  }

  function removeSavedChat(id: string) {
    setChats(deleteAssistantChat(id));
    if (activeChatIdRef.current === id) startNewChat();
  }

  async function sendChat(
    userText: string,
    command = "ai-chat",
    fallback?: string,
    selectedDocs?: UserDocument[],
  ) {
    const question = userText.trim();
    if (!question || loading) return;

    const prior = messages;
    const history = prior.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    const userMsg: ChatMessage = { id: newMessageId(), role: "user", content: question };
    stickToBottom.current = true;
    setMessages([...prior, userMsg]);
    persistCurrent([...prior, userMsg]);
    setLoading(true);
    setStatusMessage("");

    try {
      const remote = await callAi("ai-chat", {
        tender_id: tenderId,
        command,
        question,
        history,
        documents: documentPayload(selectedDocs),
      });
      const reply = answerFromRemote(
        remote,
        fallback ??
          (hasUploads
            ? `About “${question}”:\n\n${documentsPromptBlock(docs)}\n\nFor binding rules, use GHANEPS.`
            : `About “${question}”:\n\n${neededDocsFallback()}`),
      );
      setMessages((prev) => {
        const next = [...prev, { id: newMessageId(), role: "assistant" as const, content: reply }];
        persistCurrent(next);
        return next;
      });
      setGhanepsUrl(resolveGhaneps(remote?.ghaneps_url, tender));
    } finally {
      setLoading(false);
    }
  }

  async function listNeededDocs() {
    await sendChat(
      "List the documents this tender pack usually requires. Assume company registration, GRA tax, SSNIT, and financial statements are already in order.",
      "explain-tender",
      neededDocsFallback(),
    );
    setReadyPercent(null);
  }

  async function explain() {
    await sendChat(
      "Explain this tender in plain language. Focus on what the tender pack asks me to complete.",
      "explain-tender",
      `${tender?.title} is a ${tender?.procurement_type?.toLowerCase()} opportunity from ${tender?.procuring_entity_name}. ${neededDocsFallback()}`,
    );
  }

  function openDocPicker(mode: "check" | "missing") {
    if (!hasUploads) return;
    setPickerMode(mode);
    setSelectedDocIds([]);
  }

  function toggleDoc(id: string) {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function runSelectedDocCheck() {
    const chosen = docs.filter((d) => selectedDocIds.includes(d.id));
    if (!chosen.length || !pickerMode) return;
    const mode = pickerMode;
    setPickerMode(null);
    const names = chosen.map((d) => `“${d.title}”`).join(", ");
    const question =
      mode === "missing"
        ? `Find missing items for this tender using only these files: ${names}. Ignore any other uploads.`
        : `Check these files against this tender pack: ${names}. Ignore any other uploads.`;
    await sendChat(question, "ai-chat", undefined, chosen);
    const remote = await callAi("check-user-documents", {
      tender_id: tenderId,
      document_ids: chosen.map((d) => d.id),
    });
    if (remote?.ready_percent != null) setReadyPercent(remote.ready_percent);
  }

  async function onAsk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setDraft("");
    await sendChat(question);
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setStatusMessage("Uploading…");
    try {
      const result = await uploadUserDocument({
        file,
        title: file.name,
        documentType: "tender",
      });
      setLastUploadName(file.name);
      setStatusMessage(result.message);
      await refreshDocs();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const actions = [
    {
      id: "needed",
      title: "Documents Needed",
      icon: ClipboardList,
      locked: false,
      onClick: listNeededDocs,
    },
    {
      id: "explain",
      title: "Explain This Tender",
      icon: Lightbulb,
      locked: false,
      onClick: explain,
    },
    {
      id: "check",
      title: "Check My Documents",
      icon: FolderCog,
      locked: !hasUploads,
      onClick: () => openDocPicker("check"),
    },
    {
      id: "missing",
      title: "Find Missing",
      icon: FileSearch,
      locked: !hasUploads,
      onClick: () => openDocPicker("missing"),
    },
  ];

  function onTenderChange(id: string) {
    setTenderId(id);
    const t = tenders.find((x) => x.id === id);
    setGhanepsUrl(
      t ? ghanepsTenderUrl({ source_url: t.source_url, ghaneps_id: t.ghaneps_id }) : null,
    );
    if (activeChatIdRef.current && messages.length) {
      setChats(
        upsertAssistantChat({
          id: activeChatIdRef.current,
          title: chatTitleFromTender(t?.title),
          tenderId: id,
          messages,
          updatedAt: new Date().toISOString(),
        }),
      );
    }
  }

  return (
    <AppShell title="Tender Intelligence" fill>
      <div className="relative flex min-h-0 flex-1 gap-3 overflow-hidden">
        <aside className="hidden w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#d6dfd5] bg-white md:flex">
          <div className="flex items-center justify-between border-b border-[#d6dfd5] px-3 py-3">
            <p className="text-sm font-bold text-[#131e17]">Chat history</p>
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#006a3f] hover:bg-[#eaf7ec]"
            >
              <SquarePen className="h-3.5 w-3.5" aria-hidden />
              New
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {chats.length ? (
              <ul className="space-y-1">
                {chats.map((chat) => {
                  const active = chat.id === activeChatId;
                  return (
                    <li key={chat.id}>
                      <div
                        className={`group flex items-start gap-1 rounded-xl px-2 py-2 ${
                          active ? "bg-[#eaf7ec]" : "hover:bg-[#f8faf8]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openSavedChat(chat)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-bold text-[#131e17]" title={chat.title}>
                            {shortChatTitle(chat.title)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#6e7a70]">
                            {formatRelativeTime(chat.updatedAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSavedChat(chat.id)}
                          className="shrink-0 rounded-md p-1 text-[#6e7a70] opacity-0 hover:bg-white hover:text-[#ba1a1a] group-hover:opacity-100"
                          aria-label={`Delete ${chat.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-2 py-6 text-sm text-[#6e7a70]">
                Past chats appear here, named after the procurement you discussed.
              </p>
            )}
          </div>
        </aside>

        {historyOpen ? (
          <div className="absolute inset-0 z-20 flex md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[#131e17]/30"
              aria-label="Close history"
              onClick={() => setHistoryOpen(false)}
            />
            <aside className="relative z-10 flex h-full w-[min(100%,280px)] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#d6dfd5] px-3 py-3">
                <p className="text-sm font-bold text-[#131e17]">Chat history</p>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="text-sm font-bold text-[#006a3f]"
                >
                  Close
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {chats.length ? (
                  <ul className="space-y-1">
                    {chats.map((chat) => (
                      <li key={chat.id}>
                        <button
                          type="button"
                          onClick={() => openSavedChat(chat)}
                          className={`w-full rounded-xl px-3 py-2 text-left ${
                            chat.id === activeChatId ? "bg-[#eaf7ec]" : "hover:bg-[#f8faf8]"
                          }`}
                        >
                          <p className="truncate text-sm font-bold text-[#131e17]" title={chat.title}>
                            {shortChatTitle(chat.title)}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6e7a70]">
                            {formatRelativeTime(chat.updatedAt)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-6 text-sm text-[#6e7a70]">No saved chats yet.</p>
                )}
              </div>
            </aside>
          </div>
        ) : null}

        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#d6dfd5] bg-white shadow-[0_2px_4px_rgba(32,43,36,0.04)]">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#d6dfd5] bg-white px-3 py-2 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Bot className="h-5 w-5 shrink-0 text-[#006a3f]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#006a3f]">AI response</p>
              <label className="sr-only" htmlFor="tender">
                Tender to discuss
              </label>
              <select
                id="tender"
                value={tenderId}
                onChange={(e) => onTenderChange(e.target.value)}
                className="h-10 w-full max-w-xl truncate rounded-lg border border-[#d6dfd5] bg-[#f8faf8] px-3 text-sm font-semibold text-[#131e17]"
                disabled={!tenders.length}
              >
                {tenders.length ? (
                  tenders.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))
                ) : (
                  <option value="">No open tenders loaded yet</option>
                )}
                {tenderId && !tenders.some((t) => t.id === tenderId) ? (
                  <option value={tenderId}>
                    {chats.find((c) => c.id === activeChatId)?.title ?? "Previous procurement"}
                  </option>
                ) : null}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#d6dfd5] bg-white px-3 text-sm font-bold text-[#006a3f] md:hidden"
          >
            <History className="h-4 w-4" aria-hidden />
            History
          </button>
          <button
            type="button"
            onClick={startNewChat}
            disabled={!hasChat && !draft}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#d6dfd5] bg-white px-3 text-sm font-bold text-[#006a3f] hover:border-[#006a3f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SquarePen className="h-4 w-4" aria-hidden />
            New chat
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={threadRef}
            onScroll={onThreadScroll}
            className="absolute inset-0 space-y-3 overflow-y-auto bg-[#f8faf8] px-4 py-4"
          >
            {displayMessages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(100%,52rem)] rounded-2xl px-4 py-3 ${
                    m.role === "user"
                      ? "rounded-br-md bg-[#006a3f] text-white"
                      : "rounded-bl-md border border-[#b4f0cb] bg-[#eaf7ec] text-[#131e17]"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-7">{m.content}</p>
                  ) : (
                    <ChatMarkdown content={m.content} />
                  )}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <p className="rounded-2xl rounded-bl-md border border-[#b4f0cb] bg-[#eaf7ec] px-4 py-3 text-sm font-medium text-[#3e4941]">
                  Thinking…
                </p>
              </div>
            ) : null}
            {!hasChat && !hasUploads ? (
              <div className="rounded-xl border border-dashed border-[#d6dfd5] bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#6e7a70]">
                  Typical document checklist
                </p>
                <ul className="mt-2 space-y-1">
                  {TYPICAL_TENDER_DOCUMENTS.map((text) => (
                    <li key={text} className="flex items-start gap-2 text-sm text-[#3e4941]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#006a3f]" aria-hidden />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {showJump ? (
            <button
              type="button"
              onClick={scrollThreadToBottom}
              className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#d6dfd5] bg-white px-3 py-2 text-xs font-bold text-[#006a3f] shadow-md"
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
              Jump to latest
            </button>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[#d6dfd5] bg-white">
          {pickerMode ? (
            <div className="border-b border-[#d6dfd5] px-3 py-3 sm:px-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#131e17]">
                    {pickerMode === "missing"
                      ? "Which files should we search for gaps?"
                      : "Which files should the AI check for this tender?"}
                  </p>
                  <p className="text-xs text-[#6e7a70]">
                    Tick only the documents that belong to this procurement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerMode(null)}
                  className="rounded-lg p-1 text-[#6e7a70] hover:bg-[#f3f6f3]"
                  aria-label="Close file picker"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <ul className="max-h-36 space-y-1 overflow-y-auto">
                {docs.map((d) => {
                  const checked = selectedDocIds.includes(d.id);
                  return (
                    <li key={d.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f8faf8]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDoc(d.id)}
                          className="h-4 w-4 accent-[#006a3f]"
                        />
                        <FileText className="h-4 w-4 shrink-0 text-[#006a3f]" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#131e17]">
                          {d.title}
                        </span>
                        <span className="shrink-0 text-xs text-[#6e7a70]">{d.document_type}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocIds(docs.map((d) => d.id))}
                  className="text-xs font-bold text-[#006a3f]"
                >
                  Select all
                </button>
                <button
                  type="button"
                  disabled={!selectedDocIds.length || loading}
                  onClick={() => void runSelectedDocCheck()}
                  className="ml-auto h-10 rounded-xl bg-[#006a3f] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9aa69d]"
                >
                  {pickerMode === "missing" ? "Find gaps in selected" : "Check selected"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 overflow-x-auto px-3 pt-3 sm:px-4">
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={loading || a.locked || !tender}
                onClick={a.onClick}
                title={a.locked ? "Upload a document to unlock" : a.title}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold sm:text-sm ${
                  a.locked
                    ? "cursor-not-allowed border-[#d6dfd5] bg-[#f3f6f3] text-[#9aa69d]"
                    : "border-[#d6dfd5] bg-[#eaf7ec] text-[#006a3f] hover:border-[#006a3f]"
                }`}
              >
                {a.locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <a.icon className="h-3.5 w-3.5" aria-hidden />}
                {a.title}
              </button>
            ))}
          </div>

          {readyPercent !== null ? (
            <p className="px-4 pt-2 text-sm font-bold text-[#006a3f]">{readyPercent}% ready</p>
          ) : null}
          {statusMessage ? (
            <p className="px-4 pt-2 text-sm font-medium text-[#3e4941]">{statusMessage}</p>
          ) : null}
          {lastUploadName || hasUploads ? (
            <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
              {lastUploadName ? (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#eaf7ec] px-3 py-1 text-xs font-semibold text-[#006a3f]">
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{uploading ? "Uploading…" : lastUploadName}</span>
                </span>
              ) : null}
              {hasUploads ? (
                <span className="text-xs text-[#6e7a70]">
                  {docs.length} file{docs.length === 1 ? "" : "s"} ready
                </span>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={onAsk} className="flex items-end gap-2 p-3 sm:px-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about this tender pack or an uploaded PDF…"
              className="h-12 min-w-0 flex-1 rounded-xl border border-[#d6dfd5] px-4"
              disabled={loading}
              aria-label="Message"
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={DOC_ACCEPT}
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d6dfd5] text-[#006a3f] hover:bg-[#eaf7ec] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Upload a document"
              title="Upload a document"
            >
              <Paperclip className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="submit"
              disabled={!canAsk}
              className="h-12 shrink-0 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9aa69d] disabled:opacity-80"
            >
              Ask
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
            <Link href="/documents" className="text-sm font-bold text-[#006a3f]">
              My Documents →
            </Link>
            {ghanepsUrl ? (
              <OpenOnGhaneps
                sourceUrl={ghanepsUrl}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#006a3f] px-4 text-sm font-bold text-white"
              >
                Continue on GHANEPS
              </OpenOnGhaneps>
            ) : null}
          </div>
        </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Tender Intelligence" fill>
          <p className="text-[#6e7a70]">Loading assistant…</p>
        </AppShell>
      }
    >
      <AssistantInner />
    </Suspense>
  );
}
