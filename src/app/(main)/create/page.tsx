"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { EditorialComposer, type ExistingPostData } from "@/components/Post/create";
import { getPostById } from "@/actions/posts";

function CreatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  // Deep link to add a new story to an existing collection (thread).
  const collectionId = searchParams.get("collection");

  const [existingPost, setExistingPost] = useState<ExistingPostData | null>(null);
  const [loadingPost, setLoadingPost] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    setLoadingPost(true);
    getPostById(editId).then((res) => {
      if (!active) return;
      if (res.success && res.post) {
        if (!res.post.isOwn) {
          setLoadError("You can only edit your own posts.");
        } else {
          setExistingPost({
            id: res.post.id,
            postType: res.post.postType,
            content: res.post.content,
            isSensitive: res.post.isSensitive,
            tags: res.post.tags || [],
          });
        }
      } else {
        setLoadError(res.error || "Post not found.");
      }
      setLoadingPost(false);
    });
    return () => {
      active = false;
    };
  }, [editId]);

  const handleClose = () => {
    router.back();
  };

  const handleSuccess = (postId: string) => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    router.push("/feed");
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    router.back();
  };

  if (isEdit && loadingPost) {
    return (
      <>
        <title>Edit post | be.vocl</title>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <IconLoader2 size={32} className="animate-spin text-[var(--vocl-primary)]" />
        </div>
      </>
    );
  }

  if (isEdit && (loadError || !existingPost)) {
    return (
      <>
        <title>Edit post | be.vocl</title>
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/60 text-center px-6">
          <p className="text-foreground">{loadError || "Post not found."}</p>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl text-white font-medium"
            style={{ backgroundColor: "var(--vocl-primary)" }}
          >
            Go back
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <title>{isEdit ? "Edit post | be.vocl" : "New post | be.vocl"}</title>
      <EditorialComposer
        mode={isEdit ? "edit" : "create"}
        threadId={!isEdit ? collectionId || undefined : undefined}
        existingPost={existingPost || undefined}
        onSuccess={handleSuccess}
        onEditSuccess={handleEditSuccess}
        onClose={handleClose}
      />
    </>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <IconLoader2 size={32} className="animate-spin text-[var(--vocl-primary)]" />
        </div>
      }
    >
      <CreatePageInner />
    </Suspense>
  );
}
