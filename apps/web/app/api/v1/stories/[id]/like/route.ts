import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { handleError, NotFoundError, requireUser } from "@/lib/auth-guard";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { rateLimitKey } from "@/lib/request";

export const runtime = "nodejs";

const limiter = () => getLimiter("engage", 60, "1 m");

async function loadStory(idOrSlug: string) {
  const story = await db.story.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      deletedAt: null,
      status: "published",
    },
    select: { id: true },
  });
  if (!story) throw new NotFoundError("Story not found.");
  return story;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const blocked = await enforce(limiter(), await rateLimitKey());
    if (blocked) return blocked;
    const { id } = await params;
    const story = await loadStory(id);

    // Already liked? Return current state idempotently.
    const existing = await db.like.findUnique({
      where: { userId_storyId: { userId: user.id, storyId: story.id } },
      select: { userId: true },
    });
    if (existing) {
      const fresh = await db.story.findUniqueOrThrow({
        where: { id: story.id },
        select: { likeCount: true },
      });
      return json({ liked: true, likeCount: fresh.likeCount });
    }

    const [, updated] = await db.$transaction([
      db.like.create({
        data: { userId: user.id, storyId: story.id },
      }),
      db.story.update({
        where: { id: story.id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      }),
    ]);
    return json({ liked: true, likeCount: updated.likeCount });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const blocked = await enforce(limiter(), await rateLimitKey());
    if (blocked) return blocked;
    const { id } = await params;
    const story = await loadStory(id);

    const existing = await db.like.findUnique({
      where: { userId_storyId: { userId: user.id, storyId: story.id } },
      select: { userId: true },
    });
    if (!existing) {
      const fresh = await db.story.findUniqueOrThrow({
        where: { id: story.id },
        select: { likeCount: true },
      });
      return json({ liked: false, likeCount: fresh.likeCount });
    }

    const [, updated] = await db.$transaction([
      db.like.delete({
        where: { userId_storyId: { userId: user.id, storyId: story.id } },
      }),
      db.story.update({
        where: { id: story.id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      }),
    ]);
    return json({ liked: false, likeCount: updated.likeCount });
  } catch (err) {
    return handleError(err);
  }
}
