const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const envPath = path.join(__dirname, "..", ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i === -1) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const user = env.SMTP_USER;
const pass = (env.SMTP_PASS || "").replace(/\s+/g, "");
const to = process.argv[2] || user;
const appUrl = (env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

// Seed tender that exists on /tenders/[id] in local/demo data
const tenderId = "11111111-1111-1111-1111-111111111101";
const tenderTitle = "Water Supply Intervention in Mining-Affected Communities";
const procuraTenderUrl = `${appUrl}/tenders/${tenderId}`;
const ghanepsUrl = "https://www.ghaneps.gov.gh";

if (!user || !pass) {
  console.error(JSON.stringify({ ok: false, error: "Missing SMTP_USER or SMTP_PASS in .env.local" }));
  process.exit(1);
}

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

const html = `
  <p>Hello there,</p>
  <p><strong>New tender matching your interests</strong></p>
  <p>${tenderTitle} — Central Region — this matches what you said you are interested in.</p>
  <p>This tender matches what you said you are interested in.</p>
  <p style="margin:24px 0">
    <a href="${procuraTenderUrl}"
       style="display:inline-block;background:#006a3f;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">
      View this tender on Procura
    </a>
  </p>
  <p style="font-size:14px;color:#3e4941">
    On Procura you can review details, save it, and continue to GHANEPS when you are ready to bid.
  </p>
  <p style="font-size:13px;color:#6e7a70">Official source: <a href="${ghanepsUrl}">${ghanepsUrl}</a></p>
  <p style="color:#6e7a70;font-size:12px">All tender information is sourced from the GHANEPS website.</p>
`;

transport
  .sendMail({
    from: env.EMAIL_FROM || user,
    to,
    subject: "New tender matching your interests",
    html,
    text: [
      "New tender matching your interests",
      tenderTitle,
      `View this tender on Procura: ${procuraTenderUrl}`,
      "From there you can continue to GHANEPS to bid.",
    ].join("\n\n"),
  })
  .then((info) => {
    console.log(JSON.stringify({ ok: true, to, procuraTenderUrl, messageId: info.messageId }));
  })
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  });
