import { Suspense } from "react";
import { StoryListPage } from "@/components/StoryListPage";

export const dynamic = "force-dynamic";

export default function BookmarksPage() {
  return (
    <Suspense>
      <StoryListPage
        title="Bookmarks"
        subtitle="Stories you've saved"
        endpoint="/api/v1/me/bookmarks"
        emptyMessage="No bookmarks yet. Tap the bookmark icon on any story to save it for later."
      />
    </Suspense>
  );
}
