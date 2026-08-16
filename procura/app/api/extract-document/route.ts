import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CHARS = 12000;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({
        ok: true,
        extracted_text: null,
        note: "Text extraction currently supports PDF only. File was stored without text analysis.",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const raw = typeof result === "string" ? result : (result?.text ?? "");
    const text = String(raw).replace(/\s+\n/g, "\n").trim().slice(0, MAX_CHARS);

    return NextResponse.json({
      ok: true,
      extracted_text: text || null,
      truncated: String(raw).length > MAX_CHARS,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        extracted_text: null,
        error: err instanceof Error ? err.message : "Could not extract PDF text",
      },
      { status: 200 },
    );
  }
}
