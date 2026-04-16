"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconBookmark,
  IconLoader2,
  IconPlus,
  IconCheck,
  IconX,
  IconDots,
  IconPencil,
  IconTrash,
  IconFolder,
  IconFolderOpen,
} from "@tabler/icons-react";
import {
  InteractivePost,
  ImageContent,
  TextContent,
  VideoContent,
  AudioContent,
  GalleryContent,
} from "@/components/Post";
import { FeedSkeleton, ConfirmDialog, PullToRefresh } from "@/components/ui";
import {
  getBookmarksByCollection,
  getBookmarkCollections,
  createBookmarkCollection,
  renameBookmarkCollection,
  deleteBookmarkCollection,
  moveBookmarkToCollection,
} from "@/actions/bookmarks";
import type { VideoEmbedPlatform } from "@/types/database";

const BOOKMARKS_PER_PAGE = 20;

interface Collection {
  id: string;
  name: string;
  description: string | null;
  bookmarkCount: number;
  createdAt: string;
}

export default function BookmarksPage() {
  const queryClient = useQueryClient();
  const [activeCollection, setActiveCollection] = useState<string | null>(null); // null = "All"
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Context menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Move dropdown state per post
  const [moveMenuPostId, setMoveMenuPostId] = useState<string | null>(null);

  // Fetch collections
  const { data: collectionsData } = useQuery({
    queryKey: ["bookmark-collections"],
    queryFn: async () => {
      const result = await getBookmarkCollections();
      if (!result.success) throw new Error(result.error);
      return result.collections || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const collections: Collection[] = collectionsData || [];

  // Fetch bookmarks with collection filter
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["bookmarks", activeCollection],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await getBookmarksByCollection(activeCollection, {
        limit: BOOKMARKS_PER_PAGE,
        offset: pageParam,
      });
      if (!result.success) {
        throw new Error(result.error || "Failed to load bookmarks");
      }
      return {
        bookmarks: result.bookmarks || [],
        hasMore: result.hasMore || false,
        nextOffset: pageParam + BOOKMARKS_PER_PAGE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const posts = data?.pages.flatMap((page) => page.bookmarks) || [];

  // Focus create input when opening
  useEffect(() => {
    if (isCreating) {
      newNameInputRef.current?.focus();
    }
  }, [isCreating]);

  // Focus rename input
  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
    }
  }, [renamingId]);

  // Close context menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpenId]);

  // Create collection handler
  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    setCreateError(null);
    const result = await createBookmarkCollection(newName.trim());
    setIsSubmitting(false);
    if (result.success) {
      setIsCreating(false);
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["bookmark-collections"] });
    } else {
      setCreateError(result.error || "Failed to create");
    }
  }, [newName, queryClient]);

  // Rename handler
  const handleRename = useCallback(
    async (collectionId: string) => {
      if (!renameValue.trim()) return;
      const result = await renameBookmarkCollection(collectionId, renameValue.trim());
      if (result.success) {
        setRenamingId(null);
        setRenameValue("");
        queryClient.invalidateQueries({ queryKey: ["bookmark-collections"] });
      }
    },
    [renameValue, queryClient]
  );

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteBookmarkCollection(deleteTarget.id);
    setIsDeleting(false);
    if (result.success) {
      if (activeCollection === deleteTarget.id) {
        setActiveCollection(null);
      }
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["bookmark-collections"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    }
  }, [deleteTarget, activeCollection, queryClient]);

  // Move bookmark handler
  const handleMoveBookmark = useCallback(
    async (postId: string, collectionId: string | null) => {
      const result = await moveBookmarkToCollection(postId, collectionId);
      if (result.success) {
        setMoveMenuPostId(null);
        queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
        queryClient.invalidateQueries({ queryKey: ["bookmark-collections"] });
      }
    },
    [queryClient]
  );

  return (
    <PullToRefresh onRefresh={refetch}>
      <title>Bookmarks | be.vocl</title>
    <div className="max-w-xl mx-auto py-2 sm:py-3 px-2 sm:px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-vocl-accent/20 flex items-center justify-center">
          <IconBookmark size={24} className="text-vocl-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Bookmarks</h1>
      </div>

      {/* Collection pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {/* All bookmarks pill */}
        <button
          onClick={() => setActiveCollection(null)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeCollection === null
              ? "bg-vocl-accent text-white shadow-lg"
              : "bg-white/5 text-foreground/60 hover:text-foreground hover:bg-white/10"
          }`}
        >
          <IconBookmark size={15} />
          <span>All</span>
        </button>

        {/* Uncollected pill */}
        <button
          onClick={() => setActiveCollection("uncollected")}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeCollection === "uncollected"
              ? "bg-vocl-accent text-white shadow-lg"
              : "bg-white/5 text-foreground/60 hover:text-foreground hover:bg-white/10"
          }`}
        >
          <IconFolder size={15} />
          <span>Unsorted</span>
        </button>

        {/* Collection pills */}
        {collections.map((col) => (
          <div key={col.id} className="relative flex-shrink-0">
            {renamingId === col.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRename(col.id);
                }}
                className="flex items-center gap-1"
              >
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={50}
                  className="w-28 px-3 py-1.5 rounded-full text-sm bg-white/10 border border-vocl-accent text-foreground focus:outline-none"
                  onBlur={() => {
                    setRenamingId(null);
                    setRenameValue("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setRenamingId(null);
                      setRenameValue("");
                    }
                  }}
                />
                <button
                  type="submit"
                  onMouseDown={(e) => e.preventDefault()}
                  className="p-1 rounded-full bg-vocl-accent text-white"
                >
                  <IconCheck size={14} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setActiveCollection(col.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCollection === col.id
                    ? "bg-vocl-accent text-white shadow-lg"
                    : "bg-white/5 text-foreground/60 hover:text-foreground hover:bg-white/10"
                }`}
              >
                {activeCollection === col.id ? (
                  <IconFolderOpen size={15} />
                ) : (
                  <IconFolder size={15} />
                )}
                <span>{col.name}</span>
                <span
                  className={`text-xs ml-0.5 ${
                    activeCollection === col.id
                      ? "text-white/70"
                      : "text-foreground/40"
                  }`}
                >
                  {col.bookmarkCount}
                </span>
                {/* Three-dot menu */}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === col.id ? null : col.id);
                  }}
                  className={`ml-1 p-0.5 rounded-full transition-colors ${
                    activeCollection === col.id
                      ? "hover:bg-white/20"
                      : "hover:bg-white/10"
                  }`}
                >
                  <IconDots size={14} />
                </span>
              </button>
            )}

            {/* Context menu */}
            {menuOpenId === col.id && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-1 z-20 bg-vocl-surface-dark border border-white/10 rounded-xl shadow-xl py-1 min-w-[140px]"
              >
                <button
                  onClick={() => {
                    setMenuOpenId(null);
                    setRenamingId(col.id);
                    setRenameValue(col.name);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/80 hover:bg-white/5 transition-colors"
                >
                  <IconPencil size={15} />
                  Rename
                </button>
                <button
                  onClick={() => {
                    setMenuOpenId(null);
                    setDeleteTarget(col);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-vocl-like hover:bg-white/5 transition-colors"
                >
                  <IconTrash size={15} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* New collection button / inline input */}
        {isCreating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="flex-shrink-0 flex items-center gap-1"
          >
            <input
              ref={newNameInputRef}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setCreateError(null);
              }}
              placeholder="Collection name"
              maxLength={50}
              className={`w-36 px-3 py-1.5 rounded-full text-sm bg-white/10 border text-foreground placeholder:text-foreground/30 focus:outline-none ${
                createError ? "border-vocl-like" : "border-vocl-accent"
              }`}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="p-1.5 rounded-full bg-vocl-accent text-white disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconCheck size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewName("");
                setCreateError(null);
              }}
              className="p-1.5 rounded-full bg-white/5 text-foreground/60 hover:text-foreground transition-colors"
            >
              <IconX size={14} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-sm text-foreground/40 hover:text-foreground/70 bg-white/5 hover:bg-white/10 transition-all border border-dashed border-white/10 hover:border-white/20"
          >
            <IconPlus size={15} />
            <span>New</span>
          </button>
        )}
      </div>

      {/* Create error toast */}
      {createError && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-vocl-like/10 border border-vocl-like/20 text-sm text-vocl-like">
          {createError}
        </div>
      )}

      {/* Loading */}
      {isLoading && <FeedSkeleton count={3} />}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="text-center py-16">
          <IconBookmark size={48} className="mx-auto text-foreground/20 mb-4" />
          <p className="text-foreground/40 text-lg mb-2">
            {activeCollection && activeCollection !== "uncollected"
              ? "No bookmarks in this collection"
              : activeCollection === "uncollected"
              ? "No unsorted bookmarks"
              : "No bookmarks yet"}
          </p>
          <p className="text-foreground/30 text-sm">
            {activeCollection
              ? "Move bookmarks here from other views."
              : "Bookmark posts to save them for later."}
          </p>
        </div>
      )}

      {/* Bookmarked posts */}
      {posts.length > 0 && (
        <div className="flex flex-col gap-5">
          {posts.map((post: any) => {
            const postContent = post.content as any;

            return (
              <div key={post.id} className="relative">
                {/* Move-to-collection button */}
                {collections.length > 0 && (
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() =>
                        setMoveMenuPostId(
                          moveMenuPostId === post.id ? null : post.id
                        )
                      }
                      className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-foreground/60 hover:text-foreground hover:bg-black/60 transition-colors"
                      title="Move to collection"
                    >
                      <IconFolder size={16} />
                    </button>

                    {/* Move dropdown */}
                    {moveMenuPostId === post.id && (
                      <div className="absolute right-0 top-full mt-1 z-30 bg-vocl-surface-dark border border-white/10 rounded-xl shadow-xl py-1 min-w-[180px]">
                        <button
                          onClick={() => handleMoveBookmark(post.id, null)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                            !post.collectionId
                              ? "text-vocl-accent bg-vocl-accent/5"
                              : "text-foreground/80 hover:bg-white/5"
                          }`}
                        >
                          <IconBookmark size={15} />
                          Unsorted
                          {!post.collectionId && (
                            <IconCheck size={14} className="ml-auto" />
                          )}
                        </button>
                        {collections.map((col) => (
                          <button
                            key={col.id}
                            onClick={() =>
                              handleMoveBookmark(post.id, col.id)
                            }
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                              post.collectionId === col.id
                                ? "text-vocl-accent bg-vocl-accent/5"
                                : "text-foreground/80 hover:bg-white/5"
                            }`}
                          >
                            <IconFolder size={15} />
                            {col.name}
                            {post.collectionId === col.id && (
                              <IconCheck size={14} className="ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <InteractivePost
                  id={post.id}
                  author={post.author}
                  authorId={post.authorId}
                  timestamp={post.createdAt}
                  contentType={post.postType}
                  initialStats={{
                    comments: post.commentCount,
                    likes: post.likeCount,
                    reblogs: post.reblogCount,
                  }}
                  initialInteractions={{
                    hasCommented: post.hasCommented,
                    hasLiked: post.hasLiked,
                    hasReblogged: post.hasReblogged,
                  }}
                  isSensitive={post.isSensitive}
                  isOwn={post.isOwn}
                  tags={post.tags}
                  content={post.content}
                  initialBookmarked={true}
                >
                  {post.postType === "image" && postContent?.urls?.[0] && (
                    <ImageContent src={postContent.urls[0]} alt="Post image" />
                  )}
                  {post.postType === "text" &&
                    (postContent?.html || postContent?.plain) && (
                      <TextContent
                        html={postContent.html}
                        isEssay={postContent.is_essay}
                        essayTitle={postContent.essay_title}
                        readingTimeMinutes={postContent.reading_time_minutes}
                      >
                        {postContent.plain}
                      </TextContent>
                    )}
                  {post.postType === "video" && (
                    <VideoContent
                      src={postContent?.url}
                      thumbnailUrl={postContent?.thumbnail_url}
                      embedUrl={postContent?.embed_url}
                      embedPlatform={
                        postContent?.embed_platform as VideoEmbedPlatform
                      }
                      caption={postContent?.caption_html}
                    />
                  )}
                  {post.postType === "audio" &&
                    (postContent?.url || postContent?.spotify_data) && (
                      <AudioContent
                        src={postContent?.url}
                        albumArtUrl={postContent?.album_art_url}
                        spotifyData={postContent?.spotify_data}
                        caption={postContent?.caption_html}
                        transcript={postContent?.transcript}
                        isVoiceNote={postContent?.is_voice_note}
                      />
                    )}
                  {post.postType === "gallery" && postContent?.urls && (
                    <GalleryContent
                      images={postContent.urls}
                      caption={postContent.caption_html}
                    />
                  )}
                </InteractivePost>
              </div>
            );
          })}

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center py-6">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2 bg-white/5 text-foreground/70 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            </div>
          )}

          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-8">
              <IconLoader2
                size={32}
                className="animate-spin text-vocl-accent"
              />
            </div>
          )}
        </div>
      )}

      {/* Delete collection confirm dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Collection"
        message={`Delete "${deleteTarget?.name}"? Bookmarks in this collection will be moved to Unsorted, not deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
    </PullToRefresh>
  );
}
