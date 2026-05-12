import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { buildSiteUrl, sendVerificationEmail } from "@/lib/email";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { issueVerificationToken } from "@/lib/verification";

export const runtime = "nodejs";

// Tighter than the standard auth bucket — a working email account is
// effectively free to harvest, so cap resends per IP to discourage abuse.
const limiter = () => getLimiter("auth-resend", 3, "1 h");

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

// Always returns 200 regardless of whether the email is on file or
// already verified, so this endpoint can't be used to probe user
// existence. Real work happens silently.
export async function POST(req: Request) {
  const blocked = await enforce(limiter(), `ip:${await clientIp()}`);
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return error(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  const { email } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });

  if (user && !user.emailVerifiedAt) {
    const { token } = await issueVerificationToken(user.id);
    const host = (await headers()).get("host");
    const link = buildSiteUrl(
      `/verify-email?token=${encodeURIComponent(token)}`,
      host,
    );
    await sendVerificationEmail({ to: user.email, name: user.name, link });
  }

  return json({ ok: true as const });
}
