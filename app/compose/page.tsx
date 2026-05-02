"use client";

import { Composer } from "@/components/Composer";
import { GatedNotice } from "@/components/GatedNotice";
import { useAuth } from "@/components/AuthProvider";

export default function ComposePage() {
  const { user } = useAuth();
  if (!user) return <GatedNotice action="write" />;
  return <Composer />;
}
