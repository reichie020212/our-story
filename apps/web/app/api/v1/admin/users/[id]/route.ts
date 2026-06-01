import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { NotFoundError, handleError, requireAdmin } from "@/lib/auth-guard";
import { UserRoleSchema } from "@our-story/api-types";

export const runtime = "nodejs";

const PatchBody = z
  .object({
    role: UserRoleSchema.optional(),
    isSuperadmin: z.boolean().optional(),
  })
  .strict()
  .refine((b) => b.role !== undefined || b.isSuperadmin !== undefined, {
    message: "Provide `role` and/or `isSuperadmin`.",
  });

/** Admin promotes/demotes another user, and (superadmin only) grants/revokes
 *  the superadmin flag. Guard rails:
 *   - an admin can't demote themselves (never lock everyone out),
 *   - a superadmin's role can't be changed (it stays admin, undemotable),
 *   - only a superadmin may toggle the superadmin flag, and never on itself. */
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
    const { role, isSuperadmin } = parsed.data;

    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError("User not found.");

    const data: { role?: "user" | "admin"; isSuperadmin?: boolean } = {};

    if (role !== undefined) {
      if (target.isSuperadmin) {
        return error(
          422,
          "cannot_change_superadmin_role",
          "The superadmin's role can't be changed.",
        );
      }
      if (id === admin.id && role !== "admin") {
        return error(
          422,
          "cannot_demote_self",
          "You can't remove your own admin role.",
        );
      }
      data.role = role;
    }

    if (isSuperadmin !== undefined) {
      if (!admin.isSuperadmin) {
        return error(
          403,
          "superadmin_only",
          "Only a superadmin can change the superadmin flag.",
        );
      }
      if (id === admin.id && isSuperadmin === false) {
        return error(
          422,
          "cannot_unset_self_superadmin",
          "You can't remove your own superadmin status.",
        );
      }
      data.isSuperadmin = isSuperadmin;
      // A superadmin is always an admin too.
      if (isSuperadmin) data.role = "admin";
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        role: true,
        isSuperadmin: true,
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
        isSuperadmin: updated.isSuperadmin,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
