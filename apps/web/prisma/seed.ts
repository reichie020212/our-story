/**
 * Seed for OurStory.
 *
 * Creates one real test login (Mara Solís) plus the rest of the prototype's
 * authors as password-less seed users so the homepage looks populated. The
 * seed is idempotent — re-running it upserts on email and slug.
 *
 * Usage:
 *   DATABASE_URL_DIRECT=... npm run db:seed
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

import { STORIES, type Story } from "../data/stories";

const SEED_PASSWORD = "password123";
// Lucia v3's published argon2id parameters.
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

function handleFromName(name: string): string {
  return (
    "@" +
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function emailFromName(name: string): string {
  const first = name.split(/\s+/)[0]?.toLowerCase() ?? "writer";
  const safe = first
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${safe || "writer"}@ourstory.test`;
}

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL_DIRECT (or DATABASE_URL) must be set to seed the database.",
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const featured = STORIES.find((s) => s.featured) ?? STORIES[0];
    const maraHash = await hash(SEED_PASSWORD, ARGON2_OPTS);

    // Upsert one user per distinct author. Mara (the featured story's
    // author) gets a real password; the rest are placeholders.
    const authorByName = new Map<string, Story>();
    for (const s of STORIES) authorByName.set(s.author, s);

    const userIdByName = new Map<string, string>();
    for (const sample of authorByName.values()) {
      const isMara = sample.id === featured.id;
      const email = emailFromName(sample.author);
      const user = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: sample.author,
          handle: handleFromName(sample.author),
          initial: sample.authorInitial,
          passwordHash: isMara ? maraHash : null,
          // Mara is the demo admin so the approval flow is testable out of
          // the box; everyone else is a regular user. Mark her verified too
          // so the demo login isn't blocked by the email-verification gate.
          role: isMara ? "admin" : "user",
          emailVerifiedAt: isMara ? new Date() : null,
        },
        update: {
          name: sample.author,
          handle: handleFromName(sample.author),
          initial: sample.authorInitial,
          ...(isMara
            ? { passwordHash: maraHash, role: "admin", emailVerifiedAt: new Date() }
            : {}),
        },
      });
      userIdByName.set(sample.author, user.id);
    }

    // Upsert each story under its author. The featured flag is enforced
    // here too — every non-featured story is reset to featured=false.
    for (const story of STORIES) {
      const authorId = userIdByName.get(story.author);
      if (!authorId) throw new Error(`No author for ${story.id}`);
      const body = story.body ?? [
        story.synopsis,
        "(Seed placeholder — full text lives in data/stories.ts.)",
      ];
      await prisma.story.upsert({
        where: { slug: story.id },
        create: {
          slug: story.id,
          authorId,
          title: story.title,
          synopsis: story.synopsis,
          body,
          genre: story.genre as never,
          length: story.length as never,
          tags: story.tags,
          status: "published",
          featured: !!story.featured,
          publishedAt: new Date(story.published),
          minutes: story.minutes,
          viewCount: story.views,
          likeCount: story.likes,
        },
        update: {
          title: story.title,
          synopsis: story.synopsis,
          body,
          genre: story.genre as never,
          length: story.length as never,
          tags: story.tags,
          status: "published",
          featured: !!story.featured,
          publishedAt: new Date(story.published),
          minutes: story.minutes,
          viewCount: story.views,
          likeCount: story.likes,
        },
      });
    }

    // "Exactly one featured" invariant: every other story flipped off.
    await prisma.story.updateMany({
      where: { slug: { not: featured.id }, featured: true },
      data: { featured: false },
    });

    // Materialize the global settings singleton with the approval gate
    // off (direct publish — the default). Idempotent: leaves an existing
    // row's flag untouched on re-seed.
    await prisma.appSetting.upsert({
      where: { id: "global" },
      create: { id: "global", approvalRequired: false },
      update: {},
    });

    const userCount = await prisma.user.count();
    const storyCount = await prisma.story.count();
    console.log(
      `Seed complete: ${userCount} users, ${storyCount} stories (featured = ${featured.id}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
