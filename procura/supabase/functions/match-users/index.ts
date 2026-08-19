import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * match-users — match current GHANEPS tenders to users by procurement type.
 * Region is not used. UNSPSC overlap boosts score but is not required.
 * Email alerts are optional: matches are always written so the dashboard can show them.
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

  const { data: tenders } = await supabase
    .from("tenders")
    .select(
      "id, title, procurement_type, source_url, submission_deadline, tender_unspsc(unspsc_key)",
    )
    .in("status", ["open", "closing_soon"]);

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("user_id, procurement_types, email_alerts");

  const { data: interests } = await supabase
    .from("user_unspsc_interests")
    .select("user_id, unspsc_key");

  const interestByUser = new Map<string, Set<number>>();
  for (const row of interests ?? []) {
    if (!interestByUser.has(row.user_id)) interestByUser.set(row.user_id, new Set());
    interestByUser.get(row.user_id)!.add(Number(row.unspsc_key));
  }

  let matches = 0;
  let created = 0;

  for (const pref of prefs ?? []) {
    if (!pref.procurement_types?.length) continue;
    const userKeys = interestByUser.get(pref.user_id) ?? new Set();

    const { data: existingNotifs } = pref.email_alerts === false
      ? { data: [] as Array<{ tender_id: string | null }> }
      : await supabase
          .from("notifications")
          .select("tender_id")
          .eq("user_id", pref.user_id)
          .eq("notification_type", "match");

    const alreadyNotified = new Set(
      (existingNotifs ?? []).map((row) => row.tender_id).filter(Boolean),
    );

    for (const tender of tenders ?? []) {
      const typeOk =
        Boolean(tender.procurement_type) &&
        pref.procurement_types.includes(tender.procurement_type);
      if (!typeOk) continue;

      const tenderKeys = new Set(
        ((tender.tender_unspsc as { unspsc_key: number }[] | null) ?? []).map((t) =>
          Number(t.unspsc_key),
        ),
      );
      const overlap = [...userKeys].filter((k) => tenderKeys.has(k));
      const score =
        overlap.length > 0 ? Math.min(0.99, 0.75 + overlap.length * 0.05) : 0.7;

      await supabase.from("tender_matches").upsert(
        {
          user_id: pref.user_id,
          tender_id: tender.id,
          match_score: score,
          reason:
            overlap.length > 0
              ? "Matched your UNSPSC interests"
              : "Matched your tender types",
        },
        { onConflict: "user_id,tender_id" },
      );
      matches += 1;

      if (pref.email_alerts === false || alreadyNotified.has(tender.id)) continue;

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

  return new Response(
    JSON.stringify({ ok: true, matches, notifications_created: created }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
