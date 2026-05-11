import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { handleError, requireUser } from "@/lib/auth-guard";
import { initialFromName } from "@/lib/auth";

export const runtime = "nodejs";

// Handle format: leading @, then 2–24 chars of [a-z0-9-]. Matches what
// uniqueHandle() emits at signup.
const HANDLE_RE = /^@[a-z0-9]+(-[a-z0-9]+)*$/;

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(25)
      .regex(HANDLE_RE, "Handle must look like @name (letters, numbers, dashes).")
      .optional(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.handle !== undefined, {
    message: "Nothing to update.",
  });

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);
    const data = parsed.data;

    const update: Parameters<typeof db.user.update>[0]["data"] = {};
    if (data.name !== undefined) {
      update.name = data.name;
      update.initial = initialFromName(data.name);
    }
    if (data.handle !== undefined && data.handle !== user.handle) {
      const taken = await db.user.findUnique({
        where: { handle: data.handle },
        select: { id: true },
      });
      if (taken && taken.id !== user.id) {
        return error(409, "handle_taken", "That handle is already in use.");
      }
      update.handle = data.handle;
    }

    if (Object.keys(update).length === 0) {
      return json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          handle: user.handle,
          initial: user.initial,
        },
      });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: update,
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        initial: true,
      },
    });

    return json({ user: updated });
  } catch (err) {
    return handleError(err);
  }
}
