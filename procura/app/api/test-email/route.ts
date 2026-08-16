import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

/**
 * Dev / setup helper: POST to send one SMTP test email.
 * Body (optional): { "to": "you@example.com" }
 * Uses EMAIL_TEST_TO or SMTP_USER when "to" is omitted.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SMTP_TEST !== "true") {
    return NextResponse.json(
      { error: "SMTP test route disabled in production. Set ALLOW_SMTP_TEST=true to enable." },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { to?: string };
    const to =
      body.to?.trim() ||
      process.env.EMAIL_TEST_TO?.trim() ||
      process.env.SMTP_USER?.trim();

    if (!to) {
      return NextResponse.json(
        { error: "Provide { to } in the body, or set EMAIL_TEST_TO / SMTP_USER in .env.local" },
        { status: 400 },
      );
    }

    const info = await sendMail({
      to,
      subject: "Procura SMTP test",
      html: `
        <p>Hello from <strong>Procura</strong>.</p>
        <p>If you received this, SMTP is working with your app password.</p>
        <p style="color:#6e7a70;font-size:12px">Sent at ${new Date().toISOString()}</p>
      `,
      text: "Hello from Procura. If you received this, SMTP is working.",
    });

    return NextResponse.json({
      ok: true,
      to,
      messageId: info.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
