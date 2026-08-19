import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * scrape-tenders
 * Scheduled (cron) — do not trigger from user clicks.
 * Flow: scrape GHANEPS current tenders → insert/update → classify is a separate function.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHANEPS_ORIGIN = "https://www.ghaneps.gov.gh";
const LIST_URL = `${GHANEPS_ORIGIN}/epps/quickSearchAction.do?searchSelect=6`;
const DETAIL_URL = `${GHANEPS_ORIGIN}/epps/cft/prepareViewCfTWS.do`;
const USER_AGENT =
  "ProcuraBot/1.0 (Ghana tender index; respectful scheduled fetch; +https://www.ghaneps.gov.gh)";
const MAX_PAGES = 8;
const MAX_DETAIL_FETCHES = 20;
const PAGE_DELAY_MS = 400;
const DETAIL_DELAY_MS = 600;

type ProcurementType =
  | "Goods"
  | "Works"
  | "Consulting Services"
  | "Technical Services"
  | "Disposals";

type ScrapedTender = {
  ghaneps_id: string;
  title: string;
  description: string;
  procurement_type: ProcurementType | null;
  region: string | null;
  status: "open" | "closing_soon" | "closed" | "awarded" | "cancelled";
  submission_deadline: string | null;
  published_at: string | null;
  source_url: string;
  entity_name: string;
};

const REGION_PREFIX: Record<string, string> = {
  GR: "Greater Accra",
  GA: "Greater Accra",
  CR: "Central Region",
  AR: "Ashanti Region",
  ER: "Eastern Region",
  WR: "Western Region",
  WN: "Western North Region",
  VR: "Volta Region",
  NR: "Northern Region",
  UE: "Upper East Region",
  UW: "Upper West Region",
  NE: "North East Region",
  SV: "Savannah Region",
  OT: "Oti Region",
  AH: "Ahafo Region",
  BA: "Bono Region",
  BR: "Bono Region",
  BE: "Bono East Region",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string) {
  return decodeHtml(html.replace(/<[^>]+>/g, " "));
}

function parseGhanepsDate(raw: string | null): string | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
    const hasTime = Boolean(dmy[4]);
    // Date-only GHANEPS deadlines stay current through the end of that Ghana day (UTC+0).
    const hour = Number(dmy[4] ?? "23");
    const minute = Number(dmy[5] ?? "59");
    const second = Number(dmy[6] ?? (hasTime ? "0" : "59"));
    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function inferType(text: string): ProcurementType | null {
  const hay = text.toLowerCase();
  if (/\b(disposals?|sale of assets|auction)\b/.test(hay)) return "Disposals";
  if (/\b(consultanc|advisory|feasibility study)\b/.test(hay)) return "Consulting Services";
  if (/\b(technical services?|non-?consultanc|maintenance of)\b/.test(hay)) {
    return "Technical Services";
  }
  if (
    /\b(construction|rehabilitation|civil works|feeder road|building|renovation|borehole)\b/.test(
      hay,
    )
  ) {
    return "Works";
  }
  if (/\b(supply|procurement of|goods|equipment|medicines|computers|vehicle)\b/.test(hay)) {
    return "Goods";
  }
  return null;
}

function typeFromCode(code: string | null): ProcurementType | null {
  if (!code) return null;
  const parts = code.toUpperCase().split(/[/_-]/);
  for (const part of parts) {
    if (part === "GD" || part === "GDS" || part === "GOODS") return "Goods";
    if (part === "WKS" || part === "WK" || part === "WORKS") return "Works";
    if (part === "CS" || part === "CONS" || part === "CSL") return "Consulting Services";
    if (part === "TS" || part === "NC" || part === "NCS") return "Technical Services";
    if (part === "DISP" || part === "DIS") return "Disposals";
  }
  return null;
}

function regionFromCode(code: string | null): string | null {
  if (!code) return null;
  const prefix = code.trim().slice(0, 2).toUpperCase();
  return REGION_PREFIX[prefix] ?? null;
}

function regionFromText(text: string): string | null {
  const hay = text.toLowerCase();
  const named: Array<[string, string]> = [
    ["greater accra", "Greater Accra"],
    ["ashanti", "Ashanti Region"],
    ["central region", "Central Region"],
    ["eastern region", "Eastern Region"],
    ["western north", "Western North Region"],
    ["western region", "Western Region"],
    ["upper east", "Upper East Region"],
    ["upper west", "Upper West Region"],
    ["north east", "North East Region"],
    ["northern", "Northern Region"],
    ["volta", "Volta Region"],
    ["savannah", "Savannah Region"],
    ["bono east", "Bono East Region"],
    ["ahafo", "Ahafo Region"],
    ["oti region", "Oti Region"],
    ["bono", "Bono Region"],
  ];
  for (const [needle, region] of named) {
    if (hay.includes(needle)) return region;
  }
  return null;
}

function normalizeType(value: string | null): ProcurementType | null {
  if (!value) return null;
  const v = value.trim();
  if (v === "Goods" || v === "Works" || v === "Consulting Services" || v === "Technical Services" || v === "Disposals") {
    return v;
  }
  if (v === "Services" || v === "Consultancy" || v === "Consultancy Services") return "Consulting Services";
  if (v === "Non-Consultancy" || v === "Non Consultancy" || v === "Technical Service") {
    return "Technical Services";
  }
  if (v === "Disposal") return "Disposals";
  return inferType(v);
}

function statusFrom(
  deadlineIso: string | null,
  ghanepsStatus: string,
  listedAsCurrent = true,
) {
  const status = ghanepsStatus.toLowerCase();
  if (status.includes("award")) return "awarded" as const;
  if (status.includes("cancel")) return "cancelled" as const;
  if (deadlineIso) {
    const days = Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 86400000);
    // GHANEPS current-tenders list is the source of truth while a notice is still listed.
    if (days < 0) return listedAsCurrent ? ("closing_soon" as const) : ("closed" as const);
    if (days <= 3) return "closing_soon" as const;
  }
  return "open" as const;
}

function dlField(html: string, label: string) {
  const re = new RegExp(
    `<dt>\\s*${label}\\s*:\\s*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`,
    "i",
  );
  const match = html.match(re);
  return match ? stripTags(match[1]) : null;
}

function parseListPage(html: string): ScrapedTender[] {
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  const rows = tbody.split(/<tr>/i).slice(1);
  const items: ScrapedTender[] = [];

  for (const row of rows) {
    const link = row.match(/prepareViewCfTWS\.do\?resourceId=(\d+)">([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const resourceId = link[1];
    const title = stripTags(link[2]);
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    const entity = stripTags(cells[2] ?? "");
    const infoTitle = row.match(/title=['"]([^'"]+)['"]/i)?.[1] ?? "";
    const description = decodeHtml(infoTitle) || title;
    const deadlineIso = parseGhanepsDate(stripTags(cells[4] ?? ""));
    const ghanepsStatus = stripTags(cells[6] ?? "");
    const publishedIso = parseGhanepsDate(stripTags(cells[8] ?? ""));
    const hay = `${title} ${description}`;

    items.push({
      ghaneps_id: resourceId,
      title,
      description,
      procurement_type: inferType(hay),
      region: regionFromText(hay),
      status: statusFrom(deadlineIso, ghanepsStatus),
      submission_deadline: deadlineIso,
      published_at: publishedIso,
      source_url: `${DETAIL_URL}?resourceId=${resourceId}`,
      entity_name: entity || "Procuring entity",
    });
  }

  return items;
}

function parsePageCount(html: string) {
  const total = Number(html.match(/(\d+)\s+results in total/i)?.[1] ?? "0");
  const lastPage = Number(
    html.match(/Page\s+<strong>\d+<\/strong>\s+of\s+<strong>(\d+)/i)?.[1] ?? "1",
  );
  return { total, lastPage: Math.max(1, lastPage) };
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`GHANEPS request failed (${res.status}) for ${url}`);
  }
  return await res.text();
}

function applyDetail(item: ScrapedTender, html: string): ScrapedTender {
  const title = dlField(html, "Tender Title") ?? item.title;
  const description = dlField(html, "Description") ?? item.description;
  const entity = dlField(html, "Name of Procuring Entity") ?? item.entity_name;
  const uniqueId = dlField(html, "Tender Unique ID") ?? dlField(html, "APP Reference Number");
  const type =
    normalizeType(dlField(html, "Procurement Type")) ??
    typeFromCode(uniqueId) ??
    item.procurement_type;
  const region =
    regionFromCode(uniqueId) ??
    regionFromText(`${title} ${description} ${uniqueId ?? ""}`) ??
    item.region;
  const deadline =
    parseGhanepsDate(dlField(html, "Bid submission deadline date")) ?? item.submission_deadline;
  const published =
    parseGhanepsDate(dlField(html, "Date of Publication/Invitation")) ?? item.published_at;

  return {
    ...item,
    title,
    description,
    entity_name: entity,
    procurement_type: type,
    region,
    submission_deadline: deadline,
    published_at: published,
    status: statusFrom(deadline, "", true),
  };
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
    const firstHtml = await fetchHtml(`${LIST_URL}&d-3680175-p=1`);
    const { lastPage, total } = parsePageCount(firstHtml);
    const pages = Math.min(MAX_PAGES, lastPage);
    const byId = new Map<string, ScrapedTender>();

    for (const item of parseListPage(firstHtml)) {
      byId.set(item.ghaneps_id, item);
    }

    for (let page = 2; page <= pages; page += 1) {
      await sleep(PAGE_DELAY_MS);
      const html = await fetchHtml(`${LIST_URL}&d-3680175-p=${page}`);
      for (const item of parseListPage(html)) {
        byId.set(item.ghaneps_id, item);
      }
    }

    const listings = [...byId.values()];
    if (listings.length === 0) {
      throw new Error("GHANEPS returned no current tenders — refusing to insert placeholders.");
    }

    const { data: existingRows } = await supabase
      .from("tenders")
      .select("ghaneps_id, procurement_type")
      .in("ghaneps_id", listings.map((item) => item.ghaneps_id));

    const existing = new Map(
      (existingRows ?? []).map((row) => [row.ghaneps_id as string, row.procurement_type as string | null]),
    );

    let detailsFetched = 0;
    for (const item of listings) {
      const alreadyTyped = Boolean(existing.get(item.ghaneps_id));
      if (alreadyTyped || detailsFetched >= MAX_DETAIL_FETCHES) continue;
      await sleep(DETAIL_DELAY_MS);
      try {
        const detailHtml = await fetchHtml(item.source_url);
        const enriched = applyDetail(item, detailHtml);
        byId.set(item.ghaneps_id, enriched);
        detailsFetched += 1;
      } catch {
        // Keep list-page data if a detail page fails.
      }
    }

    const finalListings = [...byId.values()];
    let inserted = 0;

    for (const item of finalListings) {
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

      const payload: Record<string, unknown> = {
        ghaneps_id: item.ghaneps_id,
        title: item.title,
        description: item.description,
        region: item.region,
        status: item.status,
        submission_deadline: item.submission_deadline,
        source_url: item.source_url,
        procuring_entity_id: entityId,
        published_at: item.published_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (item.procurement_type) payload.procurement_type = item.procurement_type;

      const { error } = await supabase.from("tenders").upsert(payload, { onConflict: "ghaneps_id" });
      if (!error) inserted += 1;
    }

    if (pages >= lastPage && finalListings.length > 0) {
      const currentIds = finalListings.map((item) => item.ghaneps_id);
      await supabase
        .from("tenders")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .in("status", ["open", "closing_soon"])
        .not("ghaneps_id", "in", `(${currentIds.join(",")})`);
    }

    if (run?.id) {
      await supabase
        .from("scraper_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          tenders_found: total || finalListings.length,
          tenders_inserted: inserted,
          notes: `pages=${pages}; details=${detailsFetched}`,
        })
        .eq("id", run.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        found: finalListings.length,
        reported_total: total,
        inserted,
        details_fetched: detailsFetched,
      }),
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
