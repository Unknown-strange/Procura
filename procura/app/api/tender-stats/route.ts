import { NextResponse } from "next/server";
import { countTenders } from "@/lib/data/tenders";

export const dynamic = "force-dynamic";

/** Live tender total for the homepage counter. */
export async function GET() {
  try {
    const total = await countTenders();
    return NextResponse.json({
      total,
      source: "supabase",
      label: "Total Tenders on GHANEPS",
    });
  } catch {
    return NextResponse.json({
      total: 0,
      source: "supabase",
      label: "Total Tenders on GHANEPS",
    });
  }
}
