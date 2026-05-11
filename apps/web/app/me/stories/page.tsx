import { Suspense } from "react";
import { StoryListPage } from "@/components/StoryListPage";

export const dynamic = "force-dynamic";

export default function MyStoriesPage() {
  return (
    <Suspense>
      <StoryListPage
        title="My stories"
        subtitle="Everything you've published"
        endpoint="/api/v1/me/stories"
        filterMode="published"
        emptyMessage="You haven't published a story yet. Save a draft and hit Publish to see it here."
      />
    </Suspense>
  );
}
