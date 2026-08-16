"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  FolderCog,
  Lightbulb,
  Lock,
  Upload,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { SEED_REQUIREMENTS, SEED_TENDERS } from "@/lib/data/seed-tenders";
import { createClient } from "@/lib/supabase/client";
import { ghanepsTenderUrl } from "@/lib/ghaneps";
import {
  DOC_ACCEPT,
  DOCUMENT_TYPE_OPTIONS,
  type DocumentTypeValue,
  type UserDocument,
  documentsPromptBlock,
  listUserDocuments,
  uploadUserDocument,
} from "@/lib/documents";

function AssistantInner() {
  const searchParams = useSearchParams();
  const initialTender = searchParams.get("tender") ?? SEED_TENDERS[0]?.id ?? "";
  const [tenderId, setTenderId] = useState(initialTender);
  const [answer, setAnswer] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [readyPercent, setReadyPercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<DocumentTypeValue>("tender");
  const [ghanepsUrl, setGhanepsUrl] = useState<string | null>(
    SEED_TENDERS[0]
      ? ghanepsTenderUrl({
          source_url: SEED_TENDERS[0].source_url,
          ghaneps_id: SEED_TENDERS[0].ghaneps_id,
        })
      : null,
  );

  const hasUploads = docs.length > 0;

  const tender = useMemo(
    () => SEED_TENDERS.find((t) => t.id === tenderId) ?? SEED_TENDERS[0],
    [tenderId],
  );

  const refreshDocs = useCallback(async () => {
    const result = await listUserDocuments();
    setDocs(result.docs);
  }, []);

  useEffect(() => {
    void refreshDocs();
  }, [refreshDocs]);

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

  function resolveGhaneps(
    remoteUrl?: string | null,
    fallback?: { source_url?: string | null; ghaneps_id?: string | null } | null,
  ) {
    return ghanepsTenderUrl({
      source_url: remoteUrl ?? fallback?.source_url,
      ghaneps_id: fallback?.ghaneps_id,
    });
  }

  function neededDocsFallback() {
    const type = tender?.procurement_type ?? "Goods";
    return `Documents typically needed for a ${type} tender like “${tender?.title}”:

1. Valid business registration / Certificate of Incorporation
2. GRA Tax Clearance Certificate
3. SSNIT Clearance Certificate
4. Audited financial statements (often last 2–3 years)
5. Evidence of similar experience / past contracts
6. Any tender-specific forms from the GHANEPS bidding pack

You do not need to upload sensitive files to Procura to get this guidance. When you are ready, download the official pack on GHANEPS. Optionally upload a PDF here later if you want the AI to analyze that specific file.`;
  }

  async function listNeededDocs() {
    setLoading(true);
    setStatusMessage("Finding documents usually required…");
    const question =
      "List the documents a Ghana supplier typically needs to prepare for this tender. Do not ask them to upload sensitive documents. Focus on a clear checklist.";
    const remote = await callAi("ai-chat", {
      tender_id: tenderId,
      command: "explain-tender",
      question,
      documents: [],
    });
    setAnswer(remote?.content ?? neededDocsFallback());
    setGhanepsUrl(resolveGhaneps(remote?.ghaneps_url, tender));
    setReadyPercent(null);
    setStatusMessage("");
    setLoading(false);
  }

  async function explain() {
    setLoading(true);
    setStatusMessage("Explaining this tender…");
    const remote = await callAi("ai-chat", {
      tender_id: tenderId,
      command: "explain-tender",
      question:
        "Explain this tender in plain language and mention which document categories are usually required. Do not pressure the user to upload sensitive files.",
      documents: hasUploads
        ? docs.map((d) => ({
            id: d.id,
            title: d.title,
            document_type: d.document_type,
            status: d.status,
            extracted_text: d.extracted_text?.slice(0, 2500) ?? null,
          }))
        : [],
    });
    setAnswer(
      remote?.content ??
        `${tender?.title} is a ${tender?.procurement_type?.toLowerCase()} opportunity from ${tender?.procuring_entity_name}. ${neededDocsFallback()}`,
    );
    setGhanepsUrl(resolveGhaneps(remote?.ghaneps_url, tender));
    setStatusMessage("");
    setLoading(false);
  }

  async function checkDocs() {
    if (!hasUploads) {
      setStatusMessage("Upload at least one document first to unlock document checks.");
      return;
    }
    setLoading(true);
    setStatusMessage("Analyzing your uploaded documents…");
    const remote = await callAi("check-user-documents", { tender_id: tenderId });
    if (remote?.ready_percent != null) {
      setReadyPercent(remote.ready_percent);
      setAnswer(
        remote.message ??
          `Checked your ${docs.length} uploaded file(s) against common requirements.`,
      );
      setStatusMessage(remote.message ?? "Document check complete.");
    } else {
      const withText = docs.filter((d) => d.extracted_text).length;
      setReadyPercent(Math.min(95, 45 + docs.length * 10 + withText * 5));
      setAnswer(
        `You uploaded ${docs.length} document(s)${withText ? ` (${withText} with extracted PDF text for analysis)` : ""}:\n${docs
          .map((d) => `• ${d.title} (${d.document_type})`)
          .join("\n")}\n\nCompare these against the checklist from “Documents Needed”, then continue on GHANEPS for the official submission.`,
      );
      setStatusMessage("Local analysis complete.");
    }
    setGhanepsUrl(resolveGhaneps(remote?.ghaneps_url, tender));
    setLoading(false);
  }

  async function onAsk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const question = String(fd.get("q") ?? "");
    setLoading(true);
    setStatusMessage("Thinking…");
    const remote = await callAi("ai-chat", {
      tender_id: tenderId,
      command: "ai-chat",
      question,
      documents: hasUploads
        ? docs.map((d) => ({
            id: d.id,
            title: d.title,
            document_type: d.document_type,
            status: d.status,
            extracted_text: d.extracted_text?.slice(0, 2500) ?? null,
          }))
        : [],
    });
    setAnswer(
      remote?.content ??
        (hasUploads
          ? `About “${question}”:\n\n${documentsPromptBlock(docs)}\n\nFor binding rules, use GHANEPS.`
          : `About “${question}”:\n\n${neededDocsFallback()}`),
    );
    setGhanepsUrl(resolveGhaneps(remote?.ghaneps_url, tender));
    setStatusMessage("");
    setLoading(false);
    e.currentTarget.reset();
  }

  async function onUploadDoc(e: FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setLoading(true);
    setStatusMessage("Uploading for optional analysis…");
    try {
      const result = await uploadUserDocument({
        file: uploadFile,
        title: uploadTitle,
        documentType: uploadType,
      });
      setStatusMessage(result.message);
      setUploadFile(null);
      setUploadTitle("");
      await refreshDocs();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  const actions = [
    {
      id: "needed",
      title: "Documents Needed",
      desc: "See which documents this kind of tender usually requires — no upload needed.",
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
      desc: "Compare files you chose to upload against common requirements.",
      icon: FolderCog,
      locked: !hasUploads,
      onClick: checkDocs,
    },
    {
      id: "missing",
      title: "Find Missing Documents",
      desc: "Spot gaps after you optionally upload documents for analysis.",
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
          First, learn which documents you need. Uploading sensitive files is optional — only if you
          want the AI to analyze a PDF you choose to share.
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
            const t = SEED_TENDERS.find((x) => x.id === e.target.value);
            setGhanepsUrl(
              t
                ? ghanepsTenderUrl({ source_url: t.source_url, ghaneps_id: t.ghaneps_id })
                : null,
            );
          }}
          className="h-12 w-full max-w-2xl rounded-xl border border-[#d6dfd5] bg-white px-4"
        >
          {SEED_TENDERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={loading || a.locked}
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

      {statusMessage ? (
        <p className="mb-4 rounded-xl border border-[#d6dfd5] bg-[#eaf7ec] px-4 py-3 text-sm font-medium text-[#3e4941]">
          {statusMessage}
        </p>
      ) : null}

      <section className="mb-8 rounded-2xl border border-[#d6dfd5] bg-white p-6 shadow-[0_2px_4px_rgba(32,43,36,0.04)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[#131e17]">
            Guidance: {tender?.title ?? "Selected tender"}
          </h3>
        </div>

        <div className="rounded-xl border border-[#b4f0cb] bg-[#eaf7ec] p-4">
          <p className="text-sm font-bold text-[#006a3f]">AI response</p>
          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-[#131e17]">
            {answer ||
              "Start with “Documents Needed” to get a checklist — no sensitive upload required."}
          </p>
        </div>

        {!hasUploads ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#d6dfd5] bg-[#f8faf8] p-4">
            <p className="text-sm font-bold text-[#131e17]">Typical document checklist</p>
            <ul className="mt-3 space-y-2">
              {SEED_REQUIREMENTS.map((r) => (
                <li key={r.id} className="flex items-start gap-2 text-sm text-[#3e4941]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#006a3f]" aria-hidden />
                  {r.requirement_text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {readyPercent !== null ? (
          <p className="mt-6 text-2xl font-bold text-[#006a3f]">{readyPercent}% ready</p>
        ) : null}

        <form onSubmit={onAsk} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            placeholder="Ask what documents you need, or about an uploaded PDF…"
            className="h-12 flex-1 rounded-xl border border-[#d6dfd5] px-4"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white"
          >
            Ask
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {ghanepsUrl ? (
            <OpenOnGhaneps
              sourceUrl={ghanepsUrl}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white"
            >
              Continue on GHANEPS
            </OpenOnGhaneps>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#131e17]">Optional upload for analysis</h3>
          <Link href="/documents" className="text-sm font-bold text-[#006a3f]">
            My Documents →
          </Link>
        </div>
        <p className="mb-4 text-sm text-[#6e7a70]">
          Only upload if you want analysis. PDFs can be text-extracted for the AI. Prefer
          non-sensitive packs when possible; official bidding stays on GHANEPS.
        </p>

        <form
          onSubmit={onUploadDoc}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label className="mb-1 block text-sm font-bold">Title</label>
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder={uploadFile?.name ?? "e.g. Tender IFB PDF"}
              className="h-11 w-full rounded-xl border border-[#d6dfd5] px-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">Type</label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as DocumentTypeValue)}
              className="h-11 w-full rounded-xl border border-[#d6dfd5] bg-white px-3"
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d6dfd5] px-4 text-sm font-bold text-[#006a3f]">
            <Upload className="h-4 w-4" aria-hidden />
            {uploadFile ? "Change file" : "Choose file"}
            <input
              type="file"
              className="hidden"
              accept={DOC_ACCEPT}
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {uploadFile ? (
            <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-[#3e4941]">
                Selected: <strong>{uploadFile.name}</strong>
              </p>
              <button
                type="submit"
                disabled={loading}
                className="h-11 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                {loading ? "Uploading…" : "Upload for analysis"}
              </button>
            </div>
          ) : null}
        </form>

        {hasUploads ? (
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-[#d6dfd5] p-3">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm text-[#131e17]">
                <FileText className="h-4 w-4 shrink-0 text-[#006a3f]" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                <span className="shrink-0 text-xs text-[#6e7a70]">
                  {d.extracted_text ? "Text ready" : d.document_type}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[#6e7a70]">
            No uploads yet — that is fine. Use Documents Needed or Explain This Tender first.
          </p>
        )}
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
