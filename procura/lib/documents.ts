import { createClient } from "@/lib/supabase/client";

export const DOCUMENT_BUCKET = "user-documents";
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const DOC_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "registration", label: "Company Registration", category: "registration" },
  { value: "tax", label: "Tax / GRA", category: "tax" },
  { value: "ssnit", label: "SSNIT", category: "tax" },
  { value: "financial", label: "Financials", category: "financials" },
  { value: "tender", label: "Tender document", category: "tender" },
  { value: "other", label: "Other", category: "other" },
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPE_OPTIONS)[number]["value"];
export type DocumentCategory = (typeof DOCUMENT_TYPE_OPTIONS)[number]["category"];

export type UserDocument = {
  id: string;
  title: string;
  document_type: string;
  storage_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  extracted_text?: string | null;
  localOnly?: boolean;
};

const SESSION_KEY = "procura_session_documents";

export function categoryForType(documentType: string): DocumentCategory {
  const match = DOCUMENT_TYPE_OPTIONS.find((o) => o.value === documentType);
  return match?.category ?? "other";
}

export function formatFileLabel(mime: string | null | undefined, title: string) {
  if (mime?.includes("pdf")) return "PDF";
  if (mime?.includes("word") || title.match(/\.docx?$/i)) return "DOC";
  if (mime?.includes("image") || title.match(/\.(jpe?g|png)$/i)) return "IMG";
  const ext = title.split(".").pop();
  return (ext || "FILE").toUpperCase().slice(0, 4);
}

export function loadSessionDocuments(): UserDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UserDocument[];
  } catch {
    return [];
  }
}

function saveSessionDocuments(docs: UserDocument[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(docs));
}

export function addSessionDocument(
  partial: Omit<UserDocument, "id" | "created_at" | "localOnly">,
) {
  const doc: UserDocument = {
    ...partial,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    localOnly: true,
  };
  const next = [doc, ...loadSessionDocuments()];
  saveSessionDocuments(next);
  return doc;
}

export function removeSessionDocument(id: string) {
  saveSessionDocuments(loadSessionDocuments().filter((d) => d.id !== id));
}

async function extractPdfText(file: File): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/extract-document", { method: "POST", body: form });
    const json = await res.json();
    return typeof json.extracted_text === "string" ? json.extracted_text : null;
  } catch {
    return null;
  }
}

export async function listUserDocuments(): Promise<{
  docs: UserDocument[];
  source: "supabase" | "session";
  error?: string;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { docs: loadSessionDocuments(), source: "session" };
    }

    const { data, error } = await supabase
      .from("user_documents")
      .select(
        "id, title, document_type, storage_path, file_size, mime_type, status, created_at, expires_at, extracted_text",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        docs: loadSessionDocuments(),
        source: "session",
        error: error.message,
      };
    }

    return { docs: (data as UserDocument[]) ?? [], source: "supabase" };
  } catch (err) {
    return {
      docs: loadSessionDocuments(),
      source: "session",
      error: err instanceof Error ? err.message : "Could not load documents",
    };
  }
}

export async function uploadUserDocument(input: {
  file: File;
  title?: string;
  documentType: DocumentTypeValue;
}): Promise<{ doc: UserDocument; source: "supabase" | "session"; message: string }> {
  const { file, title, documentType } = input;
  if (file.size > MAX_DOC_BYTES) {
    throw new Error("File must be under 10MB.");
  }

  const displayTitle = (title || file.name).trim();
  const extractedText = await extractPdfText(file);

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const doc = addSessionDocument({
        title: displayTitle,
        document_type: documentType,
        storage_path: null,
        file_size: file.size,
        mime_type: file.type || null,
        status: "valid",
        expires_at: null,
        extracted_text: extractedText,
      });
      return {
        doc,
        source: "session",
        message: extractedText
          ? "Saved for this session with text extracted for AI analysis. Log in to store permanently."
          : "Saved for this session. Log in to store permanently.",
      };
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data, error } = await supabase
      .from("user_documents")
      .insert({
        user_id: user.id,
        title: displayTitle,
        document_type: documentType,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        status: "valid",
        extracted_text: extractedText,
      })
      .select(
        "id, title, document_type, storage_path, file_size, mime_type, status, created_at, expires_at, extracted_text",
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not save document record.");
    }

    return {
      doc: data as UserDocument,
      source: "supabase",
      message: extractedText
        ? "Document uploaded. PDF text extracted so the AI can analyze it."
        : "Document uploaded and saved to My Documents.",
    };
  } catch (err) {
    const doc = addSessionDocument({
      title: displayTitle,
      document_type: documentType,
      storage_path: null,
      file_size: file.size,
      mime_type: file.type || null,
      status: "valid",
      expires_at: null,
      extracted_text: extractedText,
    });
    return {
      doc,
      source: "session",
      message:
        err instanceof Error
          ? `Cloud upload failed (${err.message}). Saved for this session instead.`
          : "Cloud upload failed. Saved for this session instead.",
    };
  }
}

export async function getDocumentDownloadUrl(storagePath: string | null | undefined) {
  if (!storagePath) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteUserDocument(doc: UserDocument) {
  if (doc.localOnly || !doc.storage_path) {
    removeSessionDocument(doc.id);
    return;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    removeSessionDocument(doc.id);
    return;
  }

  await supabase.storage.from(DOCUMENT_BUCKET).remove([doc.storage_path]);
  await supabase.from("user_documents").delete().eq("id", doc.id).eq("user_id", user.id);
}

export function documentsPromptBlock(docs: UserDocument[]) {
  if (!docs.length) {
    return "User uploaded documents: (none). Do NOT pressure them to upload sensitive files. Help them identify which documents are typically needed first.";
  }
  return `User uploaded documents (optional share — use titles/types and extracted text):\n${docs
    .map((d, i) => {
      const snippet = d.extracted_text
        ? `\n   Extracted text (may be truncated):\n${d.extracted_text.slice(0, 2500)}`
        : "\n   (no extracted text)";
      return `${i + 1}. “${d.title}” — type: ${d.document_type}, status: ${d.status}${snippet}`;
    })
    .join("\n")}`;
}
