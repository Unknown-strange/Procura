import { NextResponse } from "next/server";
import { listTenders } from "@/lib/data/tenders";
import { SEED_TENDERS } from "@/lib/data/seed-tenders";

export const dynamic = "force-dynamic";

/**
 * Live tender total for homepage counter.
 * Uses Supabase when configured; otherwise seed count (demo).
 */
export async function GET() {
  try {
    const { total, source } = await listTenders({ page: 1, pageSize: 1 });
    const count = source === "seed" ? SEED_TENDERS.length : total;
    return NextResponse.json({
      total: count,
      source,
      label: "Total Tenders on GHANEPS",
    });
  } catch {
    return NextResponse.json({
      total: SEED_TENDERS.length,
      source: "seed",
      label: "Total Tenders on GHANEPS",
    });
  }
}
