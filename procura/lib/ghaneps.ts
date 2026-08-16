/** GHANEPS tender detail page (Call for Tender view). */
export const GHANEPS_HOME = "https://www.ghaneps.gov.gh";
export const GHANEPS_TENDER_VIEW =
  "https://www.ghaneps.gov.gh/epps/cft/prepareViewCfTWS.do";

/**
 * Build a deep link to a specific tender on GHANEPS.
 * Prefer an existing source_url that already includes resourceId;
 * otherwise derive from ghaneps_id / numeric resource id.
 */
export function ghanepsTenderUrl(input: {
  source_url?: string | null;
  ghaneps_id?: string | null;
  resourceId?: string | number | null;
}): string {
  const fromSource = extractResourceId(input.source_url);
  if (fromSource && input.source_url?.includes("resourceId=")) {
    try {
      const u = new URL(input.source_url);
      if (u.hostname.includes("ghaneps.gov.gh") && u.searchParams.get("resourceId")) {
        return u.toString();
      }
    } catch {
      // fall through
    }
    return `${GHANEPS_TENDER_VIEW}?resourceId=${encodeURIComponent(fromSource)}`;
  }

  const raw =
    input.resourceId != null && String(input.resourceId).trim()
      ? String(input.resourceId).trim()
      : fromSource || extractResourceId(input.ghaneps_id) || normalizeGhanepsId(input.ghaneps_id);

  if (raw) {
    return `${GHANEPS_TENDER_VIEW}?resourceId=${encodeURIComponent(raw)}`;
  }

  return GHANEPS_HOME;
}

function extractResourceId(value?: string | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    const id = u.searchParams.get("resourceId");
    if (id) return id;
  } catch {
    // not a URL
  }
  const match = value.match(/resourceId=([^&\s]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return null;
}

/** Turn GH-1001 / 1001 into a resource id fragment for deep links. */
function normalizeGhanepsId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/^GH-?/i, "").replace(/\D/g, "");
  return digits || trimmed;
}

export const PROCUREMENT_TYPE_OPTIONS = [
  {
    value: "Goods",
    label: "Goods",
    description: "Supply of equipment, materials, and consumables.",
  },
  {
    value: "Works",
    label: "Works",
    description: "Construction, rehabilitation, and civil works.",
  },
  {
    value: "Consulting Services",
    label: "Consulting Services",
    description: "Consultancy, advisory, and professional consulting.",
  },
  {
    value: "Technical Services",
    label: "Technical Services",
    description: "Non-consultancy technical and support services.",
  },
  {
    value: "Disposals",
    label: "Disposals",
    description: "Sale or disposal of public assets.",
  },
] as const;

export type ProcurementTypeOption = (typeof PROCUREMENT_TYPE_OPTIONS)[number]["value"];

export const PROCUREMENT_TYPE_VALUES = PROCUREMENT_TYPE_OPTIONS.map((o) => o.value);

/** Official Ghana regions used for alerts / filters (aligned with common GHANEPS labels). */
export const GHANA_REGION_OPTIONS = [
  "Ahafo Region",
  "Ashanti Region",
  "Bono Region",
  "Bono East Region",
  "Central Region",
  "Eastern Region",
  "Greater Accra",
  "North East Region",
  "Northern Region",
  "Oti Region",
  "Savannah Region",
  "Upper East Region",
  "Upper West Region",
  "Volta Region",
  "Western Region",
  "Western North Region",
] as const;

export type GhanaRegionOption = (typeof GHANA_REGION_OPTIONS)[number];

export function isProcurementType(value: string): value is ProcurementTypeOption {
  return (PROCUREMENT_TYPE_VALUES as readonly string[]).includes(value);
}

/** Map legacy Procura labels onto official GHANEPS types. */
export function normalizeProcurementType(value: string | null | undefined): ProcurementTypeOption | null {
  if (!value) return null;
  if (isProcurementType(value)) return value;
  if (value === "Services") return "Consulting Services";
  if (value === "Consultancy" || value === "Consultancy Services") return "Consulting Services";
  if (value === "Technical Service") return "Technical Services";
  if (value === "Disposal") return "Disposals";
  return null;
}
