import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { NotFoundError, handleError, requireAdmin } from "@/lib/auth-guard";
import { UserRoleSchema } from "@our-story/api-types";

export const runtime = "nodejs";

const PatchBody = z.object({ role: UserRoleSchema }).strict();

/** Admin promotes/demotes another user. An admin can't demote themselves,
 *  so the platform can never be left without an admin by accident. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    if (id === admin.id && parsed.data.role !== "admin") {
      return error(
        422,
        "cannot_demote_self",
        "You can't remove your own admin role.",
      );
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError("User not found.");

    const updated = await db.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        role: true,
        createdAt: true,
      },
    });

    return json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        handle: updated.handle,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
