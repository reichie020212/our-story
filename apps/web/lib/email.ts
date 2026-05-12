/**
 * Transactional email — Resend over REST.
 *
 * We don't pull the `resend` SDK to keep the dep graph slim and the
 * cold-start tiny; the API surface we actually use is one POST. When
 * `RESEND_API_KEY` is empty we fall back to logging the link to the
 * server console so local dev without Resend still works (the link
 * shows up in `pnpm dev`'s output).
 */

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

async function sendViaResend({ to, subject, html, text }: SendArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    // Dev fallback: print the link so it's easy to click in the
    // terminal. Don't throw — signup still succeeds.
    console.warn(
      `[email] RESEND_API_KEY/RESEND_FROM not set; would have sent "${subject}" to ${to}.\n${text}`,
    );
    return;
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
  await sendViaResend({ to, subject, html, text });
}
