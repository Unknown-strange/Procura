import { ghanepsTenderUrl, normalizeProcurementType } from "@/lib/ghaneps";
import { createClient } from "@/lib/supabase/server";
import type { TenderDetail, TenderListItem, TenderStatus } from "@/lib/types";

export const ACTIVE_TENDER_STATUSES = ["open", "closing_soon"] as const;

export type TenderFilters = {
  q?: string;
  type?: string;
  types?: string[];
  region?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

function applyTenderFilters(
  // Supabase query builders nest types too deeply for a recursive generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: TenderFilters,
) {
  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }
  const types = (filters.types ?? []).filter(Boolean);
  if (types.length) {
    query = query.in("procurement_type", types);
  } else if (filters.type && filters.type !== "all") {
    query = query.eq("procurement_type", filters.type);
  }
  if (filters.region && filters.region !== "all") {
    query = query.eq("region", filters.region);
  }
  if (filters.status && filters.status !== "all") {
    if (filters.status === "active") {
      query = query.in("status", [...ACTIVE_TENDER_STATUSES]);
    } else {
      query = query.eq("status", filters.status);
    }
  }
  return query;
}

function normalizeTenderUrl(
  source_url: string | null | undefined,
  ghaneps_id: string | null | undefined,
) {
  return ghanepsTenderUrl({ source_url, ghaneps_id });
}

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project"),
  );
}

type TenderRow = {
  id: string;
  ghaneps_id: string | null;
  title: string;
  description: string | null;
  procurement_type: string | null;
  region: string | null;
  status: string;
  published_at: string | null;
  submission_deadline: string | null;
  source_url: string;
  procuring_entity_id?: string | null;
  procuring_entities: { name?: string } | { name?: string }[] | null;
  tender_category_mapping?: Array<{
    tender_categories: { name: string } | { name: string }[] | null;
  }>;
  tender_documents?: Array<{ id: string; title: string; document_type: string | null }>;
};

function mapListItem(row: TenderRow): TenderListItem {
  const entity = Array.isArray(row.procuring_entities)
    ? row.procuring_entities[0]
    : row.procuring_entities;
  const mappings = row.tender_category_mapping ?? [];
  return {
    id: row.id,
    ghaneps_id: row.ghaneps_id,
    title: row.title,
    description: row.description,
    procurement_type: normalizeProcurementType(row.procurement_type),
    region: row.region,
    status: row.status as TenderStatus,
    published_at: row.published_at,
    submission_deadline: row.submission_deadline,
    source_url: normalizeTenderUrl(row.source_url, row.ghaneps_id),
    procuring_entity_name: entity?.name ?? null,
    category_names: mappings
      .map((m) => {
        const cat = Array.isArray(m.tender_categories)
          ? m.tender_categories[0]
          : m.tender_categories;
        return cat?.name;
      })
      .filter((n): n is string => Boolean(n)),
  };
}

const LIST_COLUMNS = `
  id,
  ghaneps_id,
  title,
  description,
  procurement_type,
  region,
  status,
  published_at,
  submission_deadline,
  source_url,
  procuring_entities ( name ),
  tender_category_mapping ( tender_categories ( name ) )
`;

export async function listTenders(filters: TenderFilters = {}): Promise<{
  items: TenderListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(30, Math.max(1, filters.pageSize ?? 20));
  const empty = { items: [] as TenderListItem[], total: 0, page, pageSize };

  if (!supabaseConfigured()) return empty;

  try {
    const supabase = await createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const query = applyTenderFilters(
      supabase
        .from("tenders")
        .select(LIST_COLUMNS, { count: "exact" })
        .order("submission_deadline", { ascending: true })
        .range(from, to),
      filters,
    );

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      items: ((data ?? []) as unknown as TenderRow[]).map(mapListItem),
      total: count ?? 0,
      page,
      pageSize,
    };
  } catch {
    return empty;
  }
}

export async function countTenders(
  filters: Pick<TenderFilters, "status" | "type" | "types"> = {},
): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const supabase = await createClient();
    const query = applyTenderFilters(
      supabase.from("tenders").select("id", { count: "exact", head: true }),
      filters,
    );
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getTenderById(id: string): Promise<TenderDetail | null> {
  if (!supabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenders")
      .select(
        `
        id,
        ghaneps_id,
        title,
        description,
        procurement_type,
        region,
        status,
        published_at,
        submission_deadline,
        source_url,
        procuring_entity_id,
        procuring_entities ( name ),
        tender_category_mapping ( tender_categories ( name ) ),
        tender_documents ( id, title, document_type )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as TenderRow;
    const docs = row.tender_documents ?? [];
    return {
      ...mapListItem(row),
      procuring_entity_id: row.procuring_entity_id ?? null,
      documents: docs,
    };
  } catch {
    return null;
  }
}
