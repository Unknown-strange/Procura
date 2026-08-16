import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

export function getSmtpConfig() {
  const host = (process.env.SMTP_HOST ?? "smtp.gmail.com").trim();
  const user = required("SMTP_USER");
  // Gmail app passwords are often copied with spaces — strip them
  const pass = required("SMTP_PASS").replace(/\s+/g, "");

  return {
    host,
    port: Number(process.env.SMTP_PORT ?? "465"),
    secure: (process.env.SMTP_SECURE ?? "true").toLowerCase() === "true",
    user,
    pass,
    from: process.env.EMAIL_FROM?.trim() || user,
    useGmailService:
      (process.env.SMTP_SERVICE ?? "").toLowerCase() === "gmail" ||
      host.toLowerCase().includes("gmail"),
  };
}

export function createMailTransport() {
  const cfg = getSmtpConfig();

  // Prefer Gmail's built-in profile — more reliable than raw host/port on some networks
  if (cfg.useGmailService) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
      tls: {
        minVersion: "TLSv1.2",
      },
    });
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: {
      minVersion: "TLSv1.2",
    },
  });
}

export async function sendMail(input: SendMailInput) {
  const cfg = getSmtpConfig();
  const transport = createMailTransport();
  const info = await transport.sendMail({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return info;
}
