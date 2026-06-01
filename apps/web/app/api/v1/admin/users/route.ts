import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { handleError, requireAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

/** Admin user-management list: everyone, newest first. */
export async function GET() {
  try {
    await requireAdmin();
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
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
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        handle: u.handle,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
