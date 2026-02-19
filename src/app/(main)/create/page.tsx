"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CreatePostModal } from "@/components/Post/create";

export default function CreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // If modal is closed, go back
    if (!isOpen) {
      router.back();
    }
  }, [isOpen, router]);

  const handleSuccess = (postId: string) => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
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
