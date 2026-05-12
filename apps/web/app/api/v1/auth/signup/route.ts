import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  hashPassword,
  initialFromName,
  uniqueHandle,
} from "@/lib/auth";
import { error, json, zodError } from "@/lib/api";
import { buildSiteUrl, sendVerificationEmail } from "@/lib/email";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { issueVerificationToken } from "@/lib/verification";

export const runtime = "nodejs";

const limiter = () => getLimiter("auth", 5, "1 m");

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(80),
});

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
  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return error(409, "email_taken", "That email already has an account.");
  }

  const passwordHash = await hashPassword(password);
  const handle = await uniqueHandle(name);
  const user = await db.user.create({
    data: {
      email,
      name,
      handle,
      initial: initialFromName(name),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      initial: true,
    },
  });

  // Mint the verification token + send the email. We don't start a
  // session — sign-in is gated behind the click, so the client should
  // land on a "check your email" screen.
  const { token } = await issueVerificationToken(user.id);
  const host = (await headers()).get("host");
  const link = buildSiteUrl(
    `/verify-email?token=${encodeURIComponent(token)}`,
    host,
  );
  await sendVerificationEmail({ to: user.email, name: user.name, link });

  return json({ user, verificationRequired: true as const }, { status: 201 });
}
