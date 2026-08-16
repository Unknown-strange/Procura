import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * scrape-tenders
 * Scheduled (cron) — do not trigger from user clicks.
 * Flow: scrape → insert → (classify is a separate function)
 *
 * NOTE: GHANEPS has no official API. Replace the placeholder fetch
 * with a respectful scraper when ready. Until then this upserts
 * a small fixture set so the pipeline is testable.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ScrapedTender = {
  ghaneps_id: string;
  title: string;
  description: string;
  procurement_type: "Goods" | "Works" | "Consulting Services" | "Technical Services" | "Disposals";
  region: string;
  status: string;
  submission_deadline: string;
  source_url: string;
  entity_name: string;
};

async function fetchGhanepsListings(): Promise<ScrapedTender[]> {
  // Placeholder: real implementation would parse GHANEPS HTML/JSON.
  const base = "https://www.ghaneps.gov.gh/epps/cft/prepareViewCfTWS.do?resourceId=";
  const now = Date.now();
  return [
    {
      ghaneps_id: `SCRAPE-${now}`,
      title: "Scheduled scrape sample — ICT Equipment Supply",
      description: "Placeholder tender inserted by scrape-tenders Edge Function.",
      procurement_type: "Goods",
      region: "Greater Accra",
      status: "open",
      submission_deadline: new Date(now + 20 * 86400000).toISOString(),
      source_url: `${base}SCRAPE-${now}`,
      entity_name: "Sample Procuring Entity",
    },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: run } = await supabase
    .from("scraper_runs")
    .insert({ status: "running" })
    .select("id")
    .single();

  try {
    const listings = await fetchGhanepsListings();
    let inserted = 0;

    for (const item of listings) {
      let entityId: string | null = null;
      const { data: existingEntity } = await supabase
        .from("procuring_entities")
        .select("id")
        .eq("name", item.entity_name)
        .maybeSingle();

      if (existingEntity) {
        entityId = existingEntity.id;
      } else {
        const { data: created } = await supabase
          .from("procuring_entities")
          .insert({ name: item.entity_name, region: item.region })
          .select("id")
          .single();
        entityId = created?.id ?? null;
      }

      const { error } = await supabase.from("tenders").upsert(
        {
          ghaneps_id: item.ghaneps_id,
          title: item.title,
          description: item.description,
          procurement_type: item.procurement_type,
          region: item.region,
          status: item.status,
          submission_deadline: item.submission_deadline,
          source_url: item.source_url,
          procuring_entity_id: entityId,
          published_at: new Date().toISOString(),
        },
        { onConflict: "ghaneps_id" },
      );

      if (!error) inserted += 1;
    }

    if (run?.id) {
      await supabase
        .from("scraper_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          tenders_found: listings.length,
          tenders_inserted: inserted,
        })
        .eq("id", run.id);
    }

    return new Response(
      JSON.stringify({ ok: true, found: listings.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scraper error";
    if (run?.id) {
      await supabase.from("scraper_errors").insert({
        scraper_run_id: run.id,
        message,
      });
      await supabase
        .from("scraper_runs")
        .update({ status: "failed", finished_at: new Date().toISOString(), notes: message })
        .eq("id", run.id);
    }
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
