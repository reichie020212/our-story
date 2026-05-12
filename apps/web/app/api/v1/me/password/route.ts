import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { error, json, zodError } from "@/lib/api";
import { handleError, requireUser } from "@/lib/auth-guard";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

// Change password: verify current, rotate hash, then sweep other
// sessions/tokens. The web cookie session we're called from stays
// alive (so the user isn't logged out of the tab they just submitted
// in); every other web session and every mobile refresh token for the
// user is revoked.
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);
    const { currentPassword, newPassword } = parsed.data;

    if (newPassword === currentPassword) {
      return error(
        400,
        "same_password",
        "Your new password must be different from the current one.",
      );
    }

    const row = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!row?.passwordHash) {
      // Account was created via OAuth and has no password to compare
      // against. We don't expose password-set in v1.1; punt with a
      // clear code.
      return error(
        400,
        "password_not_set",
        "This account doesn't use a password. Sign in with the linked provider.",
      );
    }
    const ok = await verifyPassword(currentPassword, row.passwordHash);
    if (!ok) {
      return error(
        400,
        "wrong_password",
        "Your current password is incorrect.",
      );
    }

    const newHash = await hashPassword(newPassword);
    const currentSessionId =
      (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      // Every other web session is killed. Keep the current cookie
      // alive so the user doesn't get logged out of the tab they
      // submitted from.
      db.session.deleteMany({
        where: {
          userId: user.id,
          ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
        },
      }),
      // Mobile refresh tokens have no concept of "current" from a web
      // tab — revoke them all so a stolen-credential scenario boots
      // every mobile install.
      db.mobileRefreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return json({ ok: true as const });
  } catch (err) {
    return handleError(err);
  }
}
