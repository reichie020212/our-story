import { Suspense } from "react";
import { StoryListPage } from "@/components/StoryListPage";

export const dynamic = "force-dynamic";

export default function DraftsPage() {
  return (
    <Suspense>
      <StoryListPage
        title="Drafts"
        subtitle="Unpublished work in progress"
        endpoint="/api/v1/me/stories"
        filterMode="draft"
        emptyMessage="No drafts yet. Start one from Write."
      />
    </Suspense>
  );
}
