import { db } from "@/lib/db";
import { error, json } from "@/lib/api";
import { NotFoundError, handleError, requireAdmin } from "@/lib/auth-guard";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const writeLimiter = () => getLimiter("write", 10, "1 m");

/** Admin approves a pending story → published. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const blocked = await enforce(writeLimiter(), `u:${admin.id}`);
    if (blocked) return blocked;
    const { id } = await params;

    const story = await db.story.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { author: true },
    });
    if (!story || story.deletedAt) throw new NotFoundError("Story not found.");
    if (story.status !== "pending_review") {
      return error(
        409,
        "not_pending",
        "Only stories awaiting review can be approved.",
      );
    }

    const updated = await db.story.update({
      where: { id: story.id },
      data: {
        status: "published",
        publishedAt: story.publishedAt ?? new Date(),
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason: null,
      },
      include: { author: true },
    });

    return json({ story: serializeStory(updated, updated.author) });
  } catch (err) {
    return handleError(err);
  }
}
