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
  ClipboardList,
  FileSearch,
  FileText,
  FolderCog,
  Lightbulb,
  Lock,
  Paperclip,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { createClient } from "@/lib/supabase/client";
import { ghanepsTenderUrl } from "@/lib/ghaneps";
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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const EMPTY_ASSISTANT =
  "Start with “Documents Needed”, then upload a tender PDF if you want analysis.";

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
  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUploads = docs.length > 0;
  const canAsk = Boolean(draft.trim()) && !loading;

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
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
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

  function documentPayload() {
    if (!hasUploads) return [];
    return docs.map((d) => ({
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

  async function sendChat(userText: string, command = "ai-chat", fallback?: string) {
    const question = userText.trim();
    if (!question || loading) return;

    const prior = messages;
    const history = prior.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    const userMsg: ChatMessage = { id: newMessageId(), role: "user", content: question };
    setMessages([...prior, userMsg]);
    setLoading(true);
    setStatusMessage("");

    try {
      const remote = await callAi("ai-chat", {
        tender_id: tenderId,
        command,
        question,
        history,
        documents: documentPayload(),
      });
      const reply = answerFromRemote(
        remote,
        fallback ??
          (hasUploads
            ? `About “${question}”:\n\n${documentsPromptBlock(docs)}\n\nFor binding rules, use GHANEPS.`
            : `About “${question}”:\n\n${neededDocsFallback()}`),
      );
      setMessages((prev) => [...prev, { id: newMessageId(), role: "assistant", content: reply }]);
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

  async function checkDocs() {
    if (!hasUploads) return;
    const question = "Check my uploaded documents against this tender pack.";
    const prior = messages;
    setMessages([...prior, { id: newMessageId(), role: "user", content: question }]);
    setLoading(true);
    setStatusMessage("");
    try {
      const remote = await callAi("check-user-documents", { tender_id: tenderId });
      let reply: string;
      if (remote?.ready_percent != null) {
        setReadyPercent(remote.ready_percent);
        reply =
          remote.message ??
          `Checked your ${docs.length} uploaded file(s) against common requirements.`;
      } else {
        const withText = docs.filter((d) => d.extracted_text).length;
        setReadyPercent(Math.min(95, 45 + docs.length * 10 + withText * 5));
        reply = `You uploaded ${docs.length} document(s)${withText ? ` (${withText} with extracted PDF text for analysis)` : ""}:\n${docs
          .map((d) => `• ${d.title} (${d.document_type})`)
          .join("\n")}\n\nCompare these against the checklist from “Documents Needed”, then continue on GHANEPS for the official submission.`;
      }
      setMessages((prev) => [...prev, { id: newMessageId(), role: "assistant", content: reply }]);
      setGhanepsUrl(resolveGhaneps(remote?.ghaneps_url, tender));
    } finally {
      setLoading(false);
    }
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
      desc: "See what the tender pack usually asks for. Company tax, SSNIT, and financials are assumed ready.",
      icon: ClipboardList,
      locked: false,
      onClick: listNeededDocs,
    },
    {
      id: "explain",
      title: "Explain This Tender",
      desc: "Plain-language summary of the opportunity and typical requirements.",
      icon: Lightbulb,
      locked: false,
      onClick: explain,
    },
    {
      id: "check",
      title: "Check My Documents",
      desc: "Analyze tender or other files you uploaded — not company registration, tax, or financials.",
      icon: FolderCog,
      locked: !hasUploads,
      onClick: checkDocs,
    },
    {
      id: "missing",
      title: "Find Missing Documents",
      desc: "Spot gaps in the tender pack you uploaded.",
      icon: FileSearch,
      locked: !hasUploads,
      onClick: checkDocs,
    },
  ];

  return (
    <AppShell title="Tender Intelligence">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Bot className="h-6 w-6 text-[#006a3f]" aria-hidden />
          <h2 className="text-2xl font-bold text-[#131e17] sm:text-3xl">Tender Assistant</h2>
        </div>
        <p className="max-w-3xl text-base text-[#6e7a70]">
          We assume your company registration, tax, SSNIT, and financial statements are intact.
          Upload only the tender pack or other working files if you want the AI to analyze them.
        </p>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-bold" htmlFor="tender">
          Tender
        </label>
        <select
          id="tender"
          value={tenderId}
          onChange={(e) => {
            setTenderId(e.target.value);
            const t = tenders.find((x) => x.id === e.target.value);
            setGhanepsUrl(
              t
                ? ghanepsTenderUrl({ source_url: t.source_url, ghaneps_id: t.ghaneps_id })
                : null,
            );
          }}
          className="h-12 w-full max-w-2xl rounded-xl border border-[#d6dfd5] bg-white px-4"
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
        </select>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={loading || a.locked || !tender}
            onClick={a.onClick}
            className={`relative overflow-hidden rounded-2xl border p-5 text-left shadow-[0_2px_4px_rgba(32,43,36,0.04)] ${
              a.locked
                ? "cursor-not-allowed border-[#d6dfd5] bg-[#f3f6f3]"
                : "border-[#d6dfd5] bg-white hover:border-[#006a3f]"
            }`}
          >
            {a.locked ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px]">
                <Lock className="mb-2 h-5 w-5 text-[#6e7a70]" aria-hidden />
                <p className="px-3 text-center text-xs font-bold text-[#3e4941]">
                  Upload a document to unlock
                </p>
              </div>
            ) : null}
            <a.icon
              className={`mb-3 h-6 w-6 ${a.locked ? "text-[#9aa69d]" : "text-[#006a3f]"}`}
              aria-hidden
            />
            <p className={`font-bold ${a.locked ? "text-[#6e7a70]" : "text-[#131e17]"}`}>
              {a.title}
            </p>
            <p className="mt-2 text-sm text-[#6e7a70]">{a.desc}</p>
          </button>
        ))}
      </div>

      <section className="flex min-h-[560px] flex-col rounded-2xl border border-[#d6dfd5] bg-white shadow-[0_2px_4px_rgba(32,43,36,0.04)]">
        <div className="border-b border-[#d6dfd5] px-5 py-4">
          <p className="text-sm font-bold text-[#006a3f]">AI response</p>
          <h3 className="mt-1 text-lg font-bold text-[#131e17]">
            Guidance: {tender?.title ?? "Selected tender"}
          </h3>
        </div>

        <div
          ref={threadRef}
          className="min-h-[420px] flex-1 space-y-3 overflow-y-auto bg-[#f8faf8] px-4 py-4 sm:px-5"
        >
          {displayMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 sm:text-base ${
                  m.role === "user"
                    ? "rounded-br-md bg-[#006a3f] text-white"
                    : "rounded-bl-md border border-[#b4f0cb] bg-[#eaf7ec] text-[#131e17]"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
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
        </div>

        {!hasUploads ? (
          <div className="border-t border-[#d6dfd5] bg-white px-5 py-3">
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

        {readyPercent !== null ? (
          <p className="border-t border-[#d6dfd5] px-5 py-3 text-lg font-bold text-[#006a3f]">
            {readyPercent}% ready
          </p>
        ) : null}

        {statusMessage ? (
          <p className="border-t border-[#d6dfd5] px-5 py-2 text-sm font-medium text-[#3e4941]">
            {statusMessage}
          </p>
        ) : null}

        {lastUploadName || hasUploads ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#d6dfd5] px-5 py-2">
            {lastUploadName ? (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#eaf7ec] px-3 py-1 text-xs font-semibold text-[#006a3f]">
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{uploading ? "Uploading…" : lastUploadName}</span>
              </span>
            ) : null}
            {hasUploads ? (
              <span className="text-xs text-[#6e7a70]">
                {docs.length} file{docs.length === 1 ? "" : "s"} ready for analysis
              </span>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={onAsk} className="flex items-center gap-2 border-t border-[#d6dfd5] p-3 sm:p-4">
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d6dfd5] px-4 py-3">
          <Link href="/documents" className="text-sm font-bold text-[#006a3f]">
            My Documents →
          </Link>
          {ghanepsUrl ? (
            <OpenOnGhaneps
              sourceUrl={ghanepsUrl}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white"
            >
              Continue on GHANEPS
            </OpenOnGhaneps>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Tender Intelligence">
          <p className="text-[#6e7a70]">Loading assistant…</p>
        </AppShell>
      }
    >
      <AssistantInner />
    </Suspense>
  );
}
