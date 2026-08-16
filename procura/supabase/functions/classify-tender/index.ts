import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * classify-tender — map tender text to UNSPSC codes via title keyword match.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const tenderId = body.tender_id as string | undefined;

  let query = admin
    .from("tenders")
    .select("id, title, description, procurement_type")
    .order("created_at", { ascending: false })
    .limit(30);
  if (tenderId) query = query.eq("id", tenderId);

  const { data: tenders } = await query;
  let mapped = 0;

  for (const tender of tenders ?? []) {
    const hay = `${tender.title} ${tender.description ?? ""}`.toLowerCase();
    const tokens = hay
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3)
      .slice(0, 12);

    if (tokens.length === 0) continue;

    // Search UNSPSC titles for overlapping keywords
    const orFilter = tokens.map((t) => `title.ilike.%${t}%`).join(",");
    const { data: codes } = await admin
      .from("unspsc_codes")
      .select("key, title, code")
      .or(orFilter)
      .limit(8);

    if (!codes?.length) continue;

    await admin.from("tender_unspsc").delete().eq("tender_id", tender.id);
    const rows = codes.map((c) => ({ tender_id: tender.id, unspsc_key: c.key }));
    const { error } = await admin.from("tender_unspsc").insert(rows);
    if (!error) mapped += 1;
  }

  return new Response(JSON.stringify({ ok: true, mapped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
