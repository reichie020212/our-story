import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { serializeStory, type StoryWire } from "@/lib/story";
import { recordViewIfEligible } from "@/lib/views";

// Force per-request rendering — story content + per-viewer state both
// come from the DB and shouldn't be cached across users.
export const dynamic = "force-dynamic";

type LoadedStory = {
  wire: StoryWire;
  id: string;
  status: string;
  authorId: string;
};

async function loadStory(
  idOrSlug: string,
  viewerId: string | null,
): Promise<LoadedStory | null> {
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
  return {
    wire: serializeStory(story, story.author, viewerState),
    id: story.id,
    status: story.status,
    authorId: story.authorId,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loaded = await loadStory(slug, null);
  if (!loaded) return { title: "Story not found · OurStory" };
  return {
    title: `${loaded.wire.title} · OurStory`,
    description: loaded.wire.synopsis,
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user } = await getCurrentSession();
  const loaded = await loadStory(slug, user?.id ?? null);
  if (!loaded) notFound();

  // Record the view (server-side dedup by ip+ua+day). When it fires,
  // bump the in-memory view count so the same render reflects it
  // rather than showing the stale pre-increment value.
  const recorded = await recordViewIfEligible({
    storyId: loaded.id,
    authorId: loaded.authorId,
    status: loaded.status,
    viewerId: user?.id ?? null,
  });
  const story: StoryWire = recorded
    ? { ...loaded.wire, views: loaded.wire.views + 1 }
    : loaded.wire;

  return <Reader story={story} signedIn={!!user} />;
}
