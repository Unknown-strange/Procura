import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_PER_HOUR = 30;

async function assertRateLimit(supabase: ReturnType<typeof createClient>, userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_interactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    throw new Error("Rate limit reached. Please try again later.");
  }
}

async function getActivePrompt(
  supabase: ReturnType<typeof createClient>,
  commandSlug: string,
) {
  const { data } = await supabase
    .from("prompt_versions")
    .select("id, prompt_text")
    .eq("command_slug", commandSlug)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

type ChatTurn = { role: "user" | "assistant"; content: string };

function normalizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim();
    if (!text) continue;
    turns.push({ role, content: text });
  }
  return turns.slice(-12);
}

function extractGroqContent(json: {
  choices?: Array<{ message?: { content?: unknown } }>;
}): string {
  const raw = json.choices?.[0]?.message?.content;
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

async function callGroq(system: string, turns: ChatTurn[]) {
  const key = Deno.env.get("GROQ_API_KEY")?.trim().replace(/^["']+|["']+$/g, "");
  if (!key) {
    return {
      content:
        "AI is not configured yet (missing GROQ_API_KEY on the Edge Function). Add it in Supabase → Edge Functions → Secrets, then try again.",
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  const messages = [
    { role: "system", content: system },
    ...turns.map((turn) => ({ role: turn.role, content: turn.content })),
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  const json = await res.json();
  const content = extractGroqContent(json);
  if (!content) {
    const groqError =
      (typeof json.error === "string" && json.error) ||
      (typeof json.error?.message === "string" && json.error.message) ||
      `Groq returned HTTP ${res.status} with no answer. Check GROQ_API_KEY in Edge Function secrets.`;
    throw new Error(groqError);
  }

  return {
    content,
    input_tokens: json.usage?.prompt_tokens ?? 0,
    output_tokens: json.usage?.completion_tokens ?? 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await assertRateLimit(supabase, user.id);

    const body = await req.json();
    const tenderId = body.tender_id as string | undefined;
    const command = (body.command as string) ?? "explain-tender";
    const question = (body.question as string) ?? "";
    const clientDocs = Array.isArray(body.documents) ? body.documents : [];
    const history = normalizeHistory(body.history);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let tender: {
      id: string;
      title: string;
      description: string | null;
      procurement_type: string | null;
      region: string | null;
      submission_deadline: string | null;
      source_url: string;
    } | null = null;

    if (tenderId) {
      const { data } = await admin
        .from("tenders")
        .select(
          "id, title, description, procurement_type, region, submission_deadline, source_url",
        )
        .eq("id", tenderId)
        .maybeSingle();
      tender = data;
    }

    const { data: dbDocs } = await admin
      .from("user_documents")
      .select("id, title, document_type, status, created_at, extracted_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);

    type DocRow = {
      id: string;
      title: string;
      document_type: string;
      status: string;
      created_at?: string;
      extracted_text?: string | null;
    };

    const docs: DocRow[] =
      dbDocs && dbDocs.length > 0
        ? dbDocs
        : clientDocs.map(
            (d: {
              id?: string;
              title?: string;
              document_type?: string;
              status?: string;
              extracted_text?: string | null;
            }) => ({
              id: d.id ?? "",
              title: d.title ?? "Untitled",
              document_type: d.document_type ?? "other",
              status: d.status ?? "valid",
              extracted_text: d.extracted_text ?? null,
            }),
          );

    const prompt = await getActivePrompt(
      admin,
      command === "ai-chat" ? "ai-chat" : command,
    );

    const docsBlock = docs.length
      ? docs
          .map((d, i) => {
            const text = d.extracted_text
              ? `\nExtracted text (truncated):\n${String(d.extracted_text).slice(0, 2500)}`
              : "\n(no extracted text)";
            return `${i + 1}. “${d.title}” (type: ${d.document_type}, status: ${d.status})${text}`;
          })
          .join("\n")
      : "(none uploaded — assume company registration, tax, SSNIT, and financials are intact. Help with the tender pack only; do not ask for those company files)";

    const tenderBlock = tender
      ? `Tender title: ${tender.title}
Description: ${tender.description}
Type: ${tender.procurement_type}
Region: ${tender.region}
Deadline: ${tender.submission_deadline}
GHANEPS URL: ${tender.source_url}`
      : "Tender: (not in database — answer from the question and any documents)";

    const system = `${prompt?.prompt_text ??
      "You help Ghana suppliers prepare for public tenders. Assume company registration, GRA tax clearance, SSNIT clearance, and financial statements are already in order — never ask the user to upload those. Only analyze tender documents and other files they share. Point them to GHANEPS for official bidding."}

Current tender:
${tenderBlock}

User uploaded documents:
${docsBlock}`;

    const currentQuestion =
      question.trim() ||
      "Help with this tender pack. Assume company registration, tax, SSNIT, and financials are already in order. Do not ask the user to upload those.";

    const turns: ChatTurn[] = [
      ...history.filter((turn) => turn.content !== currentQuestion),
      { role: "user", content: currentQuestion },
    ].slice(-12);

    const started = Date.now();
    const result = await callGroq(system, turns);

    await admin.from("ai_interactions").insert({
      user_id: user.id,
      tender_id: tender?.id ?? null,
      command_slug: command,
      prompt_version_id: prompt?.id ?? null,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      latency_ms: Date.now() - started,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        content: result.content,
        ghaneps_url: tender?.source_url ?? null,
        documents_count: docs.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI error";
    const status = message.includes("Rate limit") ? 429 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
