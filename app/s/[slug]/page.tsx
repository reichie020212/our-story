import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { serializeStory, type StoryWire } from "@/lib/story";

// Force per-request rendering — story content + per-viewer state both
// come from the DB and shouldn't be cached across users.
export const dynamic = "force-dynamic";

async function loadStory(idOrSlug: string, viewerId: string | null) {
  const story = await db.story.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      deletedAt: null,
    },
    include: { author: true },
  });
  if (!story) return null;
  const isOwner = viewerId === story.authorId;
  if (story.status !== "published" && !isOwner) return null;

  let viewerState: { liked: boolean; bookmarked: boolean } | undefined;
  if (viewerId) {
    const [like, bookmark] = await Promise.all([
      db.like.findUnique({
        where: { userId_storyId: { userId: viewerId, storyId: story.id } },
        select: { userId: true },
      }),
      db.bookmark.findUnique({
        where: { userId_storyId: { userId: viewerId, storyId: story.id } },
        select: { userId: true },
      }),
    ]);
    viewerState = { liked: !!like, bookmarked: !!bookmark };
  }
  return serializeStory(story, story.author, viewerState);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await loadStory(slug, null);
  if (!story) return { title: "Story not found · OurStory" };
  return {
    title: `${story.title} · OurStory`,
    description: story.synopsis,
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user } = await getCurrentSession();
  const story: StoryWire | null = await loadStory(slug, user?.id ?? null);
  if (!story) notFound();
  return <Reader story={story} signedIn={!!user} />;
}
