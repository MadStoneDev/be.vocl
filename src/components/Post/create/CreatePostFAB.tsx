"use client";

import { useRouter, usePathname } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

interface CreatePostFABProps {
  className?: string;
  hidden?: boolean;
}

export function CreatePostFAB({ className = "", hidden = false }: CreatePostFABProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show the "start a post" button while already in the composer.
  const onComposer = pathname === "/create";

  return (
    <article className={`hidden sm:flex ${hidden || onComposer ? "!hidden" : ""}`}>
      <button
        type="button"
        onClick={() => router.push("/create")}
        className={`fixed bottom-24 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full text-white shadow-lg shadow-background/50 ring-20 ring-background flex items-center justify-center hover:scale-110 hover:brightness-110 transition-all z-[100] ${className}`}
        style={{ backgroundColor: "var(--vocl-primary)" }}
        aria-label="Create post"
      >
        <IconPlus size={28} stroke={2.5} />
      </button>
    </article>
  );
}
