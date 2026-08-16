export type MatchAlertEmailInput = {
  recipientName?: string | null;
  title: string;
  body: string;
  /** Absolute URL to the tender on Procura, e.g. https://app.../tenders/{id} */
  procuraTenderUrl: string;
  ghanepsUrl?: string | null;
};

/** HTML for “matching tender” emails — primary CTA opens Procura tender detail. */
export function buildMatchAlertHtml(input: MatchAlertEmailInput): string {
  const name = input.recipientName?.trim() || "there";
  const ghaneps = input.ghanepsUrl?.trim();

  return `
    <p>Hello ${escapeHtml(name)},</p>
    <p><strong>${escapeHtml(input.title)}</strong></p>
    <p>${escapeHtml(input.body)}</p>
    <p>This tender matches what you said you are interested in.</p>
    <p style="margin:24px 0">
      <a href="${escapeAttr(input.procuraTenderUrl)}"
         style="display:inline-block;background:#006a3f;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">
        View this tender on Procura
      </a>
    </p>
    <p style="font-size:14px;color:#3e4941">
      On Procura you can review details, save it, and continue to GHANEPS when you are ready to bid.
    </p>
    ${
      ghaneps
        ? `<p style="font-size:13px;color:#6e7a70">Official source: <a href="${escapeAttr(ghaneps)}">${escapeHtml(ghaneps)}</a></p>`
        : ""
    }
    <p style="color:#6e7a70;font-size:12px">All tender information is sourced from the GHANEPS website.</p>
  `;
}

export function buildMatchAlertText(input: MatchAlertEmailInput): string {
  return [
    `Hello ${input.recipientName?.trim() || "there"},`,
    input.title,
    input.body,
    `View this tender on Procura: ${input.procuraTenderUrl}`,
    "From there you can continue to GHANEPS to bid.",
    input.ghanepsUrl ? `GHANEPS: ${input.ghanepsUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
