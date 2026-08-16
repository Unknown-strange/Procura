import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_REQUIREMENTS = [
  "Valid business registration certificate",
  "Valid Tax Clearance Certificate (GRA)",
  "Valid SSNIT Clearance Certificate",
  "Audited financial statements for the last 3 years",
  "Evidence of similar contracts completed recently",
];

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
      .select("id, title, description, source_url")
      .eq("id", tender_id)
      .maybeSingle();

    if (!tender) {
      return new Response(JSON.stringify({ error: "Tender not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("tender_requirements").delete().eq("tender_id", tender_id);

    const rows = DEFAULT_REQUIREMENTS.map((text, i) => ({
      tender_id,
      requirement_text: text,
      requirement_type: i < 4 ? "Mandatory" : "Optional",
      is_mandatory: i < 4,
      sort_order: i,
    }));

    const { data: inserted, error } = await admin
      .from("tender_requirements")
      .insert(rows)
      .select("id, requirement_text, requirement_type, is_mandatory");

    if (error) throw error;

    await admin.from("ai_interactions").insert({
      user_id: user.id,
      tender_id,
      command_slug: "extract-requirements",
      input_tokens: 0,
      output_tokens: 0,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        requirements: inserted,
        message: "Checking the tender documents… requirements extracted.",
        ghaneps_url: tender.source_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analyze failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
