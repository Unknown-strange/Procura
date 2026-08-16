import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * send-notification — send email for unread notifications not yet emailed.
 * Primary CTA: Procura tender page (link_url). User continues to GHANEPS from there.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "Procura <onboarding@resend.dev>";
  const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");

  const { data: pending } = await supabase
    .from("notifications")
    .select("id, user_id, title, body, ghaneps_url, link_url, profiles ( email, full_name )")
    .eq("email_sent", false)
    .eq("is_read", false)
    .limit(50);

  let sent = 0;

  for (const note of pending ?? []) {
    const profile = note.profiles as { email: string | null; full_name: string | null } | null;
    const to = profile?.email;
    if (!to) continue;

    const path = note.link_url?.startsWith("/") ? note.link_url : `/${note.link_url ?? "tenders"}`;
    const procuraUrl = appUrl ? `${appUrl}${path}` : path;
    const ghaneps = note.ghaneps_url ?? "https://www.ghaneps.gov.gh";
    const name = profile?.full_name?.trim() || "there";

    const html = `
      <p>Hello ${escapeHtml(name)},</p>
      <p><strong>${escapeHtml(note.title)}</strong></p>
      <p>${escapeHtml(note.body ?? "")}</p>
      <p>This tender matches what you said you are interested in.</p>
      <p style="margin:24px 0">
        <a href="${escapeHtml(procuraUrl)}"
           style="display:inline-block;background:#006a3f;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">
          View this tender on Procura
        </a>
      </p>
      <p style="font-size:14px;color:#3e4941">
        On Procura you can review details, save it, and continue to GHANEPS when you are ready to bid.
      </p>
      <p style="font-size:13px;color:#6e7a70">Official source: <a href="${escapeHtml(ghaneps)}">${escapeHtml(ghaneps)}</a></p>
      <p style="color:#6e7a70;font-size:12px">All tender information is sourced from the GHANEPS website.</p>
    `;

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: note.title,
          html,
        }),
      });
    }

    await supabase.from("notifications").update({ email_sent: true }).eq("id", note.id);
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, sent, dry_run: !resendKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
