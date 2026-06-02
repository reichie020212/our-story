/**
 * Transactional email.
 *
 * The verification logic never changes — only the transport, which is
 * selected from the environment at send time:
 *
 *   1. SMTP_HOST set            → send over SMTP (dev → Mailpit, or a
 *                                  Mailtrap sandbox; any SMTP sink works)
 *   2. RESEND_API_KEY + _FROM   → send via Resend's REST API (production)
 *   3. neither                  → log the link to the server console so
 *                                  local dev works with zero setup
 *
 * SMTP takes priority over Resend on purpose: if a real Resend key is
 * sitting in your local `.env`, dev mail still goes to the local sink
 * instead of leaking out to real inboxes.
 *
 * We don't pull the `resend` SDK (one POST is all we use) and we
 * lazy-import `nodemailer` only when the SMTP path actually fires, so the
 * production cold-start — which never touches SMTP — stays lean.
 */
import type { Transporter } from "nodemailer";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

// ---------- Transport selection ----------

type Transport = "smtp" | "resend" | "console";

function pickTransport(): Transport {
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) return "resend";
  return "console";
}

/** The From header. SMTP sinks accept anything; Resend requires a verified
 *  sender. Falls back so a missing SMTP_FROM in dev isn't fatal. */
function fromAddress(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM ||
    "OurStory <no-reply@ourstory.test>"
  );
}

// ---------- SMTP (dev: Mailpit / Mailtrap sandbox) ----------

let transporter: Transporter | null = null;

async function getSmtpTransport(): Promise<Transporter> {
  if (transporter) return transporter;
  // Lazy so nodemailer never loads on the Resend/console paths.
  const { createTransport } = await import("nodemailer");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "1025"),
    // 465 = implicit TLS. Mailpit (1025) and Mailtrap sandbox (2525/587)
    // use no TLS / STARTTLS, so default this off unless asked.
    secure: process.env.SMTP_SECURE === "true",
    // Mailpit needs no auth; Mailtrap does — include it only when present.
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

async function sendViaSmtp({ to, subject, html, text }: SendArgs) {
  try {
    await (await getSmtpTransport()).sendMail({
      from: fromAddress(),
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    throw new EmailSendError(
      `SMTP send failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ---------- Resend (production) ----------

async function sendViaResend({ to, subject, html, text }: SendArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  // pickTransport() only routes here when both are set, but keep the
  // guard so a direct call can't silently send from nowhere.
  if (!apiKey || !from) {
    throw new EmailSendError("RESEND_API_KEY / RESEND_FROM are not configured.");
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new EmailSendError(
      `Resend rejected the email: ${res.status} ${detail.slice(0, 200)}`,
    );
  }
}

/** Route an email through whichever transport the environment selects. */
async function deliver(args: SendArgs): Promise<void> {
  switch (pickTransport()) {
    case "smtp":
      return sendViaSmtp(args);
    case "resend":
      return sendViaResend(args);
    default:
      // Dev fallback: print the link so it's easy to click in the
      // terminal. Don't throw — signup still succeeds.
      console.warn(
        `[email] no transport configured (set SMTP_HOST or RESEND_API_KEY/RESEND_FROM); ` +
          `would have sent "${args.subject}" to ${args.to}.\n${args.text}`,
      );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Build the absolute URL we put inside verification links. Falls back
 *  to the request's host when `NEXT_PUBLIC_SITE_URL` is unset, which
 *  helps local dev on `localhost:3000` without ceremony. */
export function buildSiteUrl(path: string, reqHost?: string | null): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return `${configured}${path}`;
  if (reqHost) {
    const scheme = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${scheme}://${reqHost}${path}`;
  }
  return path;
}

/** Send the verification link to a freshly-signed-up user. The link
 *  carries the *raw* token (server stores only the sha256 hash); this
 *  is the single moment that raw token is in plaintext. */
export async function sendVerificationEmail(args: {
  to: string;
  name: string;
  link: string;
}): Promise<void> {
  const { to, name, link } = args;
  const safeName = escapeHtml(name || "there");
  const safeLink = escapeHtml(link);
  const subject = "Verify your email · OurStory";
  const text = `Hi ${name || "there"},

Welcome to OurStory. Confirm your email to activate your account:

${link}

The link expires in 24 hours. If you didn't sign up, you can ignore this email.

— OurStory`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#faf7f1;font-family:Georgia,'Times New Roman',serif;color:#2b261f;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:24px;margin:0 0 16px;letter-spacing:-0.01em;">Welcome to OurStory</h1>
    <p style="font-size:16px;line-height:1.55;margin:0 0 20px;">
      Hi ${safeName}, confirm your email to activate your account.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${safeLink}" style="display:inline-block;background:#2b261f;color:#faf7f1;text-decoration:none;padding:12px 18px;border-radius:8px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;letter-spacing:0.04em;">
        Verify email
      </a>
    </p>
    <p style="font-size:13px;line-height:1.55;color:#6b6358;margin:0 0 8px;">
      Or paste this link into your browser:
    </p>
    <p style="font-size:13px;line-height:1.55;word-break:break-all;margin:0 0 24px;">
      <a href="${safeLink}" style="color:#6b6358;">${safeLink}</a>
    </p>
    <p style="font-size:12px;color:#9a907f;margin:0;">
      The link expires in 24 hours. If you didn't sign up, you can ignore this email.
    </p>
  </div>
</body></html>`;
  await deliver({ to, subject, html, text });
}
