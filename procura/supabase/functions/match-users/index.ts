import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * match-users — match tenders to users by UNSPSC interests (+ region/type fallback).
 * Email path: send-notification uses ghaneps_url.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: tenders } = await supabase
    .from("tenders")
    .select(
      "id, title, region, procurement_type, source_url, submission_deadline, created_at, tender_unspsc(unspsc_key)",
    )
    .in("status", ["open", "closing_soon"])
    .gte("created_at", since);

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("user_id, regions, procurement_types, email_alerts");

  const { data: interests } = await supabase
    .from("user_unspsc_interests")
    .select("user_id, unspsc_key");

  const interestByUser = new Map<string, Set<number>>();
  for (const row of interests ?? []) {
    if (!interestByUser.has(row.user_id)) interestByUser.set(row.user_id, new Set());
    interestByUser.get(row.user_id)!.add(Number(row.unspsc_key));
  }

  let created = 0;

  for (const pref of prefs ?? []) {
    if (pref.email_alerts === false) continue;
    const userKeys = interestByUser.get(pref.user_id) ?? new Set();

    for (const tender of tenders ?? []) {
      const tenderKeys = new Set(
        ((tender.tender_unspsc as { unspsc_key: number }[] | null) ?? []).map((t) =>
          Number(t.unspsc_key),
        ),
      );

      const regionOk =
        !pref.regions?.length ||
        !tender.region ||
        pref.regions.includes(tender.region);
      const typeOk =
        !pref.procurement_types?.length ||
        !tender.procurement_type ||
        pref.procurement_types.includes(tender.procurement_type);

      let unspscOk = true;
      let score = 0.5;
      if (userKeys.size > 0) {
        const overlap = [...userKeys].filter((k) => tenderKeys.has(k));
        unspscOk = overlap.length > 0;
        score = unspscOk ? Math.min(0.99, 0.7 + overlap.length * 0.05) : 0;
      }

      if (!regionOk || !typeOk || !unspscOk) continue;

      await supabase.from("tender_matches").upsert(
        {
          user_id: pref.user_id,
          tender_id: tender.id,
          match_score: score,
          reason:
            userKeys.size > 0
              ? "Matched your UNSPSC interests"
              : "Matched your region/type preferences",
        },
        { onConflict: "user_id,tender_id" },
      );

      const { error } = await supabase.from("notifications").insert({
        user_id: pref.user_id,
        tender_id: tender.id,
        title: "New tender matching your interests",
        body: `${tender.title} — this matches what you said you are interested in.`,
        notification_type: "match",
        link_url: `/tenders/${tender.id}`,
        ghaneps_url: tender.source_url,
      });

      if (!error) created += 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, notifications_created: created }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
