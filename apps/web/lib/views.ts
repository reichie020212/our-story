import { db } from "./db";
import { enforce, getLimiter } from "./ratelimit";
import {
  clientIp,
  rateLimitKey,
  userAgent,
  viewDedupHash,
} from "./request";

const viewLimiter = () => getLimiter("view", 30, "1 m");

/** Insert a View row keyed by `hash(ip + ua + day_bucket)`. The unique
 *  constraint on (storyId, sessionHash) gives a 24h dedup window for
 *  free. Story.viewCount is bumped in the same transaction so the
 *  counter never drifts from the rows that backed it. */
async function recordView(storyId: string): Promise<boolean> {
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
    return true;
  } catch (err) {
    // P2002 = unique violation = already counted in this 24h bucket.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === "P2002"
    ) {
      return false;
    }
    throw err;
  }
}

/** Conditionally record a view for a story load. Skips drafts, owner
 *  self-reads, and requests that hit the per-session view limiter.
 *  Returns true iff Story.viewCount was actually incremented. */
export async function recordViewIfEligible(args: {
  storyId: string;
  authorId: string;
  status: string;
  viewerId: string | null;
}): Promise<boolean> {
  if (args.status !== "published") return false;
  if (args.authorId === args.viewerId) return false;
  const blocked = await enforce(viewLimiter(), await rateLimitKey());
  if (blocked) return false;
  return recordView(args.storyId);
}
