import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * optimize-prompts — Gemini background job only. Never user-facing.
 * Reads feedback + performance, proposes a new prompt variant as draft/experimental.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: job } = await admin
    .from("prompt_optimization_jobs")
    .insert({ status: "running", command_slug: "explain-tender" })
    .select("id")
    .single();

  try {
    const { data: active } = await admin
      .from("prompt_versions")
      .select("id, prompt_text, command_slug")
      .eq("status", "active")
      .eq("command_slug", "explain-tender")
      .limit(1)
      .maybeSingle();

    const { data: feedback } = await admin
      .from("ai_feedback")
      .select("rating, comment")
      .order("created_at", { ascending: false })
      .limit(50);

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    let newPrompt =
      (active?.prompt_text ??
        "Explain this Ghana public tender in plain language. Do not invent requirements.") +
      " Prefer short paragraphs and bullet lists for construction bidders.";

    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You improve AI *instructions* for a Ghana procurement assistant. Never invent procurement facts. Rewrite this system prompt to be clearer for contractors aged 40-50. Current prompt:\n${active?.prompt_text}\nRecent feedback: ${JSON.stringify(feedback ?? [])}`,
                  },
                ],
              },
            ],
          }),
        },
      );
      const json = await res.json();
      newPrompt =
        json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? newPrompt;
    }

    const { data: variant } = await admin
      .from("prompt_versions")
      .insert({
        command_slug: "explain-tender",
        version_label: `auto-${Date.now()}`,
        prompt_text: newPrompt,
        status: "experimental",
      })
      .select("id")
      .single();

    if (active?.id && variant?.id) {
      await admin.from("prompt_experiments").insert({
        command_slug: "explain-tender",
        control_version_id: active.id,
        variant_version_id: variant.id,
        traffic_percent: 10,
        status: "running",
      });
    }

    if (job?.id) {
      await admin
        .from("prompt_optimization_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          output_summary: { variant_id: variant?.id, used_gemini: Boolean(geminiKey) },
        })
        .eq("id", job.id);
    }

    return new Response(
      JSON.stringify({ ok: true, variant_id: variant?.id, used_gemini: Boolean(geminiKey) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Optimization failed";
    if (job?.id) {
      await admin
        .from("prompt_optimization_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          output_summary: { error: message },
        })
        .eq("id", job.id);
    }
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
