import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { tender_id } = await req.json();
    if (!tender_id) {
      return new Response(JSON.stringify({ error: "tender_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("ai_interactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= 30) {
      return new Response(JSON.stringify({ error: "Rate limit reached" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tender } = await admin
      .from("tenders")
      .select("id, source_url, title")
      .eq("id", tender_id)
      .maybeSingle();

    const { data: requirements } = await admin
      .from("tender_requirements")
      .select("id, requirement_text, is_mandatory")
      .eq("tender_id", tender_id)
      .order("sort_order");

    const { data: docs } = await admin
      .from("user_documents")
      .select("id, title, document_type, status")
      .eq("user_id", user.id);

    const docTypes = new Set((docs ?? []).map((d) => d.document_type.toLowerCase()));
    const docTitles = (docs ?? []).map((d) => d.title.toLowerCase()).join(" ");

    await admin.from("document_checks").delete().eq("user_id", user.id).eq("tender_id", tender_id);

    const checks = (requirements ?? []).map((req) => {
      const text = req.requirement_text.toLowerCase();
      let status: "FOUND" | "MISSING" | "UNCLEAR" = "MISSING";
      let explanation = "Your document is missing for this requirement.";
      let confidence = 0.7;

      if (
        (text.includes("tax") && (docTypes.has("tax") || docTitles.includes("tax"))) ||
        (text.includes("ssnit") && (docTypes.has("ssnit") || docTitles.includes("ssnit"))) ||
        (text.includes("registration") &&
          (docTypes.has("registration") || docTitles.includes("registration"))) ||
        (text.includes("financial") &&
          (docTypes.has("financial") || docTitles.includes("audit")))
      ) {
        status = "FOUND";
        explanation = "We found a matching document in your uploads.";
        confidence = 0.85;
      } else if ((docs ?? []).length === 0) {
        status = "UNCLEAR";
        explanation = "Upload your company documents so we can check this properly.";
        confidence = 0.4;
      }

      return {
        user_id: user.id,
        tender_id,
        requirement_id: req.id,
        status,
        confidence_score: confidence,
        ai_explanation: explanation,
      };
    });

    const { data: inserted } = await admin
      .from("document_checks")
      .insert(checks)
      .select("id, status, confidence_score, ai_explanation, requirement_id");

    const found = (inserted ?? []).filter((c) => c.status === "FOUND").length;
    const total = inserted?.length ?? 0;
    const readyPct = total === 0 ? 0 : Math.round((found / total) * 100);

    await admin.from("ai_interactions").insert({
      user_id: user.id,
      tender_id,
      command_slug: "check-documents",
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ready_percent: readyPct,
        checks: inserted,
        message: `Checking your documents… You are about ${readyPct}% ready.`,
        ghaneps_url: tender?.source_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
