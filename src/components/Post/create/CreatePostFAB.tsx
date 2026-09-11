"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* eslint-disable @typescript-eslint/no-unused-vars */
interface CreatePostFABProps {
  className?: string;
  hidden?: boolean;
}

/**
 * The broadsheet redesign removes the floating pink "+" circle (explicitly
 * banned by the brief). Desktop compose now lives as a masthead-level outline
 * "Write" button in the Sections rail (LeftSidebar); mobile keeps its top-bar
 * and bottom-nav compose entries. This component is retained as a no-op so its
 * existing mount points don't need to change, while still warming the composer
 * chunk on hover-idle for fast navigation.
 */
export function CreatePostFAB(_props: CreatePostFABProps) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/create");
  }, [router]);

  return null;
}
