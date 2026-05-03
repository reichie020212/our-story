import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import {
  ForbiddenError,
  NotFoundError,
  getAuthenticatedUser,
  handleError,
  requireUser,
} from "@/lib/auth-guard";
import { enforce, getLimiter } from "@/lib/ratelimit";
import {
  clientIp,
  rateLimitKey,
  userAgent,
  viewDedupHash,
} from "@/lib/request";
import { minutesFromBody, serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const viewLimiter = () => getLimiter("view", 30, "1 m");
const writeLimiter = () => getLimiter("write", 10, "1 m");

/** Insert a View row keyed by `hash(ip + ua + day_bucket)` — the unique
 *  constraint on (storyId, sessionHash) gives us a 24h dedup for free.
 *  Increments Story.viewCount only when a fresh row was inserted, so the
 *  counter doesn't double-count the same reader. */
async function recordView(storyId: string): Promise<void> {
  const [ip, ua] = await Promise.all([clientIp(), userAgent()]);
  const sessionHash = viewDedupHash(ip, ua);
  try {
    await db.$transaction([
      db.view.create({ data: { storyId, sessionHash } }),
      db.story.update({
        where: { id: storyId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    // P2002 = unique violation = already counted in this 24h bucket.
    // Anything else surfaces — viewCount staying off by one is fine,
    // crashing the read isn't.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === "P2002"
    ) {
      return;
    }
    throw err;
  }
}

/** Look up by slug OR id so /api/v1/stories/my-first-home and the
 *  /api/v1/stories/<cuid> form both work. Drafts are visible only to
 *  the owner. */
async function loadStoryReadable(idOrSlug: string, userId: string | null) {
  const story = await db.story.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      deletedAt: null,
    },
    include: { author: true },
  });
  if (!story) return null;
  const isOwner = userId === story.authorId;
  if (story.status !== "published" && !isOwner) return null;
  return story;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    const story = await loadStoryReadable(id, user?.id ?? null);
    if (!story) throw new NotFoundError("Story not found.");

    // View counting only for published stories, only when the request
    // makes it past the per-session view limiter. Owners reading their
    // own work or readers blocked by the limiter still get the story
    // back — the counter just doesn't move.
    if (story.status === "published" && story.authorId !== user?.id) {
      const blocked = await enforce(viewLimiter(), await rateLimitKey());
      if (!blocked) await recordView(story.id);
    }

    // Per-viewer state — only populated when there's a session, so
    // anonymous callers don't get personalized fields.
    let viewerState: { liked: boolean; bookmarked: boolean } | undefined;
    if (user) {
      const [like, bookmark] = await Promise.all([
        db.like.findUnique({
          where: { userId_storyId: { userId: user.id, storyId: story.id } },
          select: { userId: true },
        }),
        db.bookmark.findUnique({
          where: { userId_storyId: { userId: user.id, storyId: story.id } },
          select: { userId: true },
        }),
      ]);
      viewerState = { liked: !!like, bookmarked: !!bookmark };
    }

    return json({ story: serializeStory(story, story.author, viewerState) });
  } catch (err) {
    return handleError(err);
  }
}

const GENRES = [
  "literary",
  "fantasy",
  "scifi",
  "romance",
  "horror",
  "mystery",
  "memoir",
  "poetry",
] as const;
const LENGTHS = ["flash", "short", "novelette", "novella"] as const;

const PatchBody = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    synopsis: z.string().trim().max(500).optional(),
    body: z.array(z.string().max(2000)).max(30).optional(),
    genre: z.enum(GENRES).optional(),
    length: z.enum(LENGTHS).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  })
  .strict();

async function loadOwnedStory(idOrSlug: string, userId: string) {
  const story = await db.story.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { author: true },
  });
  if (!story || story.deletedAt) throw new NotFoundError("Story not found.");
  if (story.authorId !== userId) throw new ForbiddenError();
  return story;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const blocked = await enforce(writeLimiter(), `u:${user.id}`);
    if (blocked) return blocked;
    const { id } = await params;
    const story = await loadOwnedStory(id, user.id);

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);
    const data = parsed.data;

    const update: Parameters<typeof db.story.update>[0]["data"] = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.synopsis !== undefined) update.synopsis = data.synopsis;
    if (data.body !== undefined) {
      update.body = data.body;
      update.minutes = minutesFromBody(data.body);
    }
    if (data.genre !== undefined) update.genre = data.genre;
    if (data.length !== undefined) update.length = data.length;
    if (data.tags !== undefined) {
      update.tags = Array.from(
        new Set(data.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-"))),
      );
    }

    if (Object.keys(update).length === 0) {
      return json({ story: serializeStory(story, story.author) });
    }

    const updated = await db.story.update({
      where: { id: story.id },
      data: update,
      include: { author: true },
    });

    return json({ story: serializeStory(updated, updated.author) });
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
    const blocked = await enforce(writeLimiter(), `u:${user.id}`);
    if (blocked) return blocked;
    const { id } = await params;
    const story = await loadOwnedStory(id, user.id);
    await db.story.update({
      where: { id: story.id },
      data: { deletedAt: new Date() },
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
