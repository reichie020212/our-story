import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { NotFoundError, handleError, requireAdmin } from "@/lib/auth-guard";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const writeLimiter = () => getLimiter("write", 10, "1 m");

const RejectBody = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, "Give the author a reason for the rejection.")
      .max(500),
  })
  .strict();

/** Admin rejects a pending story → rejected, with a reason the author sees. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const blocked = await enforce(writeLimiter(), `u:${admin.id}`);
    if (blocked) return blocked;
    const { id } = await params;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = RejectBody.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const story = await db.story.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { author: true },
    });
    if (!story || story.deletedAt) throw new NotFoundError("Story not found.");
    if (story.status !== "pending_review") {
      return error(
        409,
        "not_pending",
        "Only stories awaiting review can be rejected.",
      );
    }

    const updated = await db.story.update({
      where: { id: story.id },
      data: {
        status: "rejected",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason: parsed.data.reason,
      },
      include: { author: true },
    });

    return json({ story: serializeStory(updated, updated.author) });
  } catch (err) {
    return handleError(err);
  }
}
