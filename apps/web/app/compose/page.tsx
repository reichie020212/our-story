"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Composer } from "@/components/Composer";
import { GatedNotice } from "@/components/GatedNotice";
import { useAuth } from "@/components/AuthProvider";

function ComposeInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  if (!user) return <GatedNotice action="write" />;
  const editSlug = params.get("edit") ?? undefined;
  return <Composer editSlug={editSlug} />;
}

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <ComposeInner />
    </Suspense>
  );
}
