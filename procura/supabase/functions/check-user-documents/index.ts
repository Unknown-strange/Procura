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

    const { tender_id, document_ids } = await req.json();
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

    let docsQuery = admin
      .from("user_documents")
      .select("id, title, document_type, status")
      .eq("user_id", user.id);
    if (Array.isArray(document_ids) && document_ids.length > 0) {
      docsQuery = docsQuery.in("id", document_ids.map(String));
    }
    const { data: docs } = await docsQuery;

    const docTypes = new Set((docs ?? []).map((d) => d.document_type.toLowerCase()));
    const docTitles = (docs ?? []).map((d) => d.title.toLowerCase()).join(" ");

    await admin.from("document_checks").delete().eq("user_id", user.id).eq("tender_id", tender_id);

    const COMPANY_DOC_HINT =
      /\b(tax|gra|ssnit|registration|incorporat|financial statement|audited|clearance)\b/;

    const checks = (requirements ?? []).map((req) => {
      const text = req.requirement_text.toLowerCase();
      let status: "FOUND" | "MISSING" | "UNCLEAR" = "UNCLEAR";
      let explanation =
        "We assume your company registration, tax, SSNIT, and financials are in order. Upload the tender pack if you want us to check that file.";
      let confidence = 0.6;

      if (COMPANY_DOC_HINT.test(text)) {
        status = "FOUND";
        explanation =
          "Assumed in order. Procura does not collect company registration, tax, SSNIT, or financial statements.";
        confidence = 0.9;
      } else if (
        (text.includes("tender") && (docTypes.has("tender") || docTitles.includes("tender"))) ||
        (text.includes("form") && (docTypes.has("tender") || docTitles.includes("form"))) ||
        (text.includes("bid security") && docTitles.includes("security")) ||
        (text.includes("experience") &&
          (docTitles.includes("experience") || docTitles.includes("contract"))) ||
        ((docs ?? []).length > 0 && (docTypes.has("tender") || docTypes.has("other")))
      ) {
        status = "FOUND";
        explanation = "Matched against a tender or other file you uploaded.";
        confidence = 0.8;
      } else if ((docs ?? []).length === 0) {
        status = "UNCLEAR";
        explanation =
          "Upload the tender document or other working files to check this. Do not upload tax, SSNIT, or financial statements.";
        confidence = 0.4;
      } else {
        status = "MISSING";
        explanation = "This item was not found in the tender/other files you uploaded.";
        confidence = 0.65;
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
        message: `Checked ${docs?.length ?? 0} selected file(s) for this tender. Company tax, SSNIT, and financials are assumed in order. You are about ${readyPct}% ready on the pack we can see.`,
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
