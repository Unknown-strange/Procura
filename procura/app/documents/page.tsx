"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Download,
  FileCheck2,
  FileText,
  FolderOpen,
  Trash2,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  DOC_ACCEPT,
  DOCUMENT_TYPE_OPTIONS,
  type DocumentCategory,
  type DocumentTypeValue,
  type UserDocument,
  categoryForType,
  deleteUserDocument,
  formatFileLabel,
  getDocumentDownloadUrl,
  listUserDocuments,
  uploadUserDocument,
} from "@/lib/documents";

const COLUMNS: Array<{
  key: DocumentCategory;
  title: string;
  icon: typeof Briefcase;
}> = [
  { key: "registration", title: "Company Registration", icon: Briefcase },
  { key: "tax", title: "Tax & SSNIT", icon: FileCheck2 },
  { key: "financials", title: "Financials", icon: Building2 },
  { key: "tender", title: "Tender Documents", icon: FolderOpen },
  { key: "other", title: "Other", icon: FileText },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [source, setSource] = useState<"supabase" | "session">("session");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<DocumentTypeValue>("registration");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const refresh = useCallback(async () => {
    const result = await listUserDocuments();
    setDocs(result.docs);
    setSource(result.source);
    if (result.error) setMessage(result.error);
    setHydrating(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("Choose a file first.");
      return;
    }
    setLoading(true);
    setMessage("Uploading your document…");
    try {
      const result = await uploadUserDocument({
        file,
        title,
        documentType,
      });
      setMessage(result.message);
      setTitle("");
      setFile(null);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onDownload(doc: UserDocument) {
    try {
      const url = await getDocumentDownloadUrl(doc.storage_path);
      if (!url) {
        setMessage("This session file has no cloud download link. Re-upload after logging in.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create download link.");
    }
  }

  async function onDelete(doc: UserDocument) {
    setLoading(true);
    try {
      await deleteUserDocument(doc);
      setMessage(`Removed “${doc.title}”.`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete document.");
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<DocumentCategory, UserDocument[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    for (const doc of docs) {
      const key = categoryForType(doc.document_type);
      map.get(key)?.push(doc);
    }
    return map;
  }, [docs]);

  return (
    <AppShell title="Tender Intelligence" searchPlaceholder="Search documents, tenders...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#131e17] sm:text-3xl">My Documents</h2>
          <p className="mt-2 text-base text-[#6e7a70]">
            Uploads are optional. Use them only if you want analysis — start with the Assistant
            checklist for what documents you need. Official bidding stays on GHANEPS.
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6e7a70]">
            Storage: {source === "supabase" ? "Saved to your account" : "This browser session only"}
          </p>
        </div>
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white">
          <Upload className="h-4 w-4" aria-hidden />
          Upload Document
          <input
            type="file"
            className="hidden"
            accept={DOC_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {file ? (
        <form
          onSubmit={onUpload}
          className="mb-6 grid gap-3 rounded-2xl border border-[#d6dfd5] bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label className="mb-1 block text-sm font-bold">Document title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={file.name}
              className="h-11 w-full rounded-xl border border-[#d6dfd5] px-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">Document type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentTypeValue)}
              className="h-11 w-full rounded-xl border border-[#d6dfd5] bg-white px-3"
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? "Uploading…" : "Confirm Upload"}
            </button>
            <button
              type="button"
              className="h-11 rounded-xl border border-[#d6dfd5] px-4 text-sm font-bold text-[#3e4941]"
              onClick={() => setFile(null)}
            >
              Cancel
            </button>
          </div>
          <p className="sm:col-span-3 text-sm text-[#6e7a70]">
            Selected: {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        </form>
      ) : null}

      {message ? <p className="mb-4 text-sm font-medium text-[#3e4941]">{message}</p> : null}

      {hydrating ? (
        <p className="text-sm text-[#6e7a70]">Loading documents…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = grouped.get(col.key) ?? [];
            return (
              <section key={col.key}>
                <div className="mb-3 flex items-center gap-2">
                  <col.icon className="h-5 w-5 text-[#006a3f]" aria-hidden />
                  <h3 className="font-bold text-[#131e17]">{col.title}</h3>
                  <span className="rounded-full bg-[#eaf7ec] px-2 py-0.5 text-xs font-bold text-[#006a3f]">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((doc) => (
                    <article
                      key={doc.id}
                      className="rounded-2xl border border-[#d6dfd5] bg-white p-4 shadow-[0_2px_4px_rgba(32,43,36,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf7ec] text-[#006a3f]">
                            <FileText className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#131e17]">{doc.title}</p>
                            <p className="text-xs text-[#6e7a70]">
                              {formatFileLabel(doc.mime_type, doc.title)} ·{" "}
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs capitalize text-[#6e7a70]">
                              Type: {doc.document_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6e7a70] hover:bg-[#eaf7ec]"
                            aria-label="Download"
                            onClick={() => void onDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6]"
                            aria-label="Delete"
                            onClick={() => void onDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="rounded-full bg-[#b4f0cb] px-3 py-1 text-xs font-bold capitalize text-[#006a3f]">
                          {doc.status.replace("_", " ")}
                        </span>
                      </div>
                    </article>
                  ))}
                  <label className="flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#d6dfd5] text-sm font-bold text-[#006a3f]">
                    + Add Document
                    <input
                      type="file"
                      className="hidden"
                      accept={DOC_ACCEPT}
                      onChange={(e) => {
                        const next = e.target.files?.[0] ?? null;
                        setFile(next);
                        const match = DOCUMENT_TYPE_OPTIONS.find((o) => o.category === col.key);
                        if (match) setDocumentType(match.value);
                      }}
                    />
                  </label>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
