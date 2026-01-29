"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { CreatePostModal } from "./CreatePostModal";

interface CreatePostFABProps {
  className?: string;
}

export function CreatePostFAB({ className = "" }: CreatePostFABProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = (postId: string) => {
    // Navigate to feed after posting
    router.push("/feed");
    router.refresh();
  };

  return (
    <article className={`hidden sm:flex`}>
      {/* FAB Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-24 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-vocl-accent text-white shadow-lg shadow-vocl-accent/30 flex items-center justify-center hover:scale-110 hover:bg-vocl-accent-hover transition-all z-40 ${className}`}
        aria-label="Create post"
      >
        <IconPlus size={28} stroke={2.5} />
      </button>

      {/* Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </article>
  );
}
