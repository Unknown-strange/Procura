import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CompactRow = { k: number; c: string; t: string; p: number | null };

const SEGMENTS: CompactRow[] = [
  { k: 100, c: "A", t: "Raw Materials, Chemicals, Paper, Fuel", p: null },
  { k: 101, c: "B", t: "Industrial Equipment & Tools", p: null },
  { k: 102, c: "C", t: "Components & Supplies", p: null },
  {
    k: 103,
    c: "D",
    t: "Construction, Transportation & Facility Equipment & Supplies",
    p: null,
  },
  {
    k: 104,
    c: "E",
    t: "Medical, Laboratory & Test Equipment & Supplies & Pharmaceuticals",
    p: null,
  },
  {
    k: 105,
    c: "F",
    t: "Food, Cleaning & Service Industry Equipment & Supplies",
    p: null,
  },
  {
    k: 106,
    c: "G",
    t: "Business, Communication & Technology Equipment & Supplies",
    p: null,
  },
  {
    k: 107,
    c: "H",
    t: "Defense, Security & Safety Equipment & Supplies",
    p: null,
  },
  {
    k: 108,
    c: "I",
    t: "Personal, Domestic & Consumer Equipment & Supplies",
    p: null,
  },
  { k: 109, c: "J", t: "Services", p: null },
];

let cache: CompactRow[] | null = null;

async function loadCompact(): Promise<CompactRow[] | null> {
  if (cache) return cache;
  const candidates = [
    path.join(process.cwd(), "data", "unspsc-compact.json"),
    path.join(process.cwd(), "..", "data", "unspsc-compact.json"),
  ];
  for (const file of candidates) {
    try {
      const raw = await readFile(file, "utf8");
      cache = JSON.parse(raw) as CompactRow[];
      return cache;
    } catch {
      // try next
    }
  }
  return null;
}

function mapRow(r: CompactRow) {
  return { key: r.k, code: r.c, title: r.t, parent_key: r.p };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const mode = searchParams.get("mode") ?? "search";

  if (mode === "segments" || !q || q.length < 2) {
    return NextResponse.json({ items: SEGMENTS.map(mapRow) });
  }

  const all = await loadCompact();
  if (!all) {
    return NextResponse.json({
      items: SEGMENTS.filter(
        (r) => r.t.toLowerCase().includes(q) || r.c.toLowerCase().includes(q),
      ).map(mapRow),
      note: "Full UNSPSC index not loaded; showing segments. Place data/unspsc-compact.json or seed Supabase.",
    });
  }

  const items = all
    .filter((r) => r.t.toLowerCase().includes(q) || r.c.toLowerCase().includes(q))
    .slice(0, 40)
    .map(mapRow);

  return NextResponse.json({ items });
}
