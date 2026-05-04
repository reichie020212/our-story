import { randomBytes } from "node:crypto";
import { db } from "./db";

const MAX_SLUG_LEN = 80;
const COLLISION_SUFFIX_LEN = 4;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SLUG_LEN);
}

/** Find a free slug for a story. Falls back to a random suffix on
 *  collision (silent — the user shouldn't have to pick another title). */
export async function uniqueStorySlug(input: string): Promise<string> {
  const base = slugify(input) || "untitled";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0
        ? base
        : `${base}-${randomBytes(COLLISION_SUFFIX_LEN)
            .toString("base64url")
            .slice(0, COLLISION_SUFFIX_LEN)
            .toLowerCase()}`;
    const taken = await db.story.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error("Could not generate a unique story slug after 5 attempts.");
}
