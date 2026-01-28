"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreatePostModal } from "@/components/Post/create";

export default function CreatePage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // If modal is closed, go back
    if (!isOpen) {
      router.back();
    }
  }, [isOpen, router]);

  const handleSuccess = (postId: string) => {
    // Redirect to the new post or feed
    router.push("/feed");
  };

  return (
    <CreatePostModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSuccess={handleSuccess}
    />
  );
}
