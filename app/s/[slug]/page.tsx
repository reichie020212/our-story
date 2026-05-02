import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { STORIES } from "@/data/stories";

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = STORIES.find((s) => s.id === slug);
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
  const story = STORIES.find((s) => s.id === slug);
  if (!story) notFound();
  return <Reader story={story} />;
}
