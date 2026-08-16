import type { ProcurementTypeOption } from "@/lib/ghaneps";

export type TenderStatus = "open" | "closing_soon" | "closed" | "awarded" | "cancelled";
/** Official GHANEPS procurement types. */
export type ProcurementType = ProcurementTypeOption;

export type TenderListItem = {
  id: string;
  ghaneps_id: string | null;
  title: string;
  description: string | null;
  procurement_type: ProcurementType | null;
  region: string | null;
  status: TenderStatus;
  published_at: string | null;
  submission_deadline: string | null;
  source_url: string;
  procuring_entity_name: string | null;
  category_names: string[];
};

export type TenderDetail = TenderListItem & {
  procuring_entity_id: string | null;
  documents: { id: string; title: string; document_type: string | null }[];
};

export type DocumentCheckStatus = "FOUND" | "MISSING" | "UNCLEAR";
