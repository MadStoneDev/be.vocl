/**
 * Shared helper: batch-fetch engagement stats & user interactions for a set of post IDs.
 * Used by posts.ts and recommendations.ts to avoid duplicating this logic.
 * NOT a server action - imported by server action files.
 *
 * Optimized: Reads denormalized counter columns (posts.like_count/comment_count/
 * reblog_count) in a single query instead of 3*N per-post count queries.
 * User-interaction Sets, tags, and bookmarks are fetched as before.
 */
export async function batchFetchPostStats(
  supabase: any,
  postIds: string[],
  userId?: string,
  options?: { includeTags?: boolean; includeBookmarks?: boolean }
) {
  if (postIds.length === 0) {
    return {
      likeCountMap: new Map<string, number>(),
      commentCountMap: new Map<string, number>(),
      reblogCountMap: new Map<string, number>(),
      userLikeSet: new Set<string>(),
      userCommentSet: new Set<string>(),
      userReblogSet: new Set<string>(),
      userBookmarkSet: new Set<string>(),
      voiceCountMap: new Map<string, number>(),
      tagsMap: new Map<string, Array<{ id: string; name: string }>>(),
    };
  }

  // Build all queries in parallel.
  // Counts come from denormalized counter columns in ONE query (replaces 3*N
  // per-post count queries). User interactions remain per-user row queries.
  const queries: Promise<any>[] = [
    // Single counter query for all posts.
    supabase
      .from("posts")
      .select("id, like_count, comment_count, reblog_count")
      .in("id", postIds),
    // User interaction queries: only fetch the user's own interactions (small result sets)
    userId
      ? supabase.from("likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from("comments").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from("posts").select("reblogged_from_id").eq("author_id", userId).in("reblogged_from_id", postIds).neq("status", "deleted")
      : Promise.resolve({ data: [] }),
    // Voice ("spoken") reaction counts — one row per reactor per post.
    supabase.from("post_audio_reactions").select("post_id").in("post_id", postIds),
  ];

  if (options?.includeTags) {
    queries.push(
      supabase.from("post_tags").select("post_id, tag:tag_id (id, name)").in("post_id", postIds)
    );
  }

  if (options?.includeBookmarks && userId) {
    queries.push(
      supabase.from("bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds)
    );
  }

  const results = await Promise.all(queries);

  // Parse counter results (single query: posts with denormalized counters)
  const likeCountMap = new Map<string, number>();
  const commentCountMap = new Map<string, number>();
  const reblogCountMap = new Map<string, number>();

  for (const row of results[0]?.data || []) {
    likeCountMap.set(row.id, row.like_count || 0);
    commentCountMap.set(row.id, row.comment_count || 0);
    reblogCountMap.set(row.id, row.reblog_count || 0);
  }

  // Parse user interaction results
  const userLikesData = results[1];
  const userCommentsData = results[2];
  const userReblogsData = results[3];

  // Parse voice reaction counts (fixed query index 4)
  const voiceCountMap = new Map<string, number>();
  for (const row of results[4]?.data || []) {
    voiceCountMap.set(row.post_id, (voiceCountMap.get(row.post_id) || 0) + 1);
  }

  // Parse optional results
  const tagsMap = new Map<string, Array<{ id: string; name: string }>>();
  let optIdx = 5;
  if (options?.includeTags) {
    const postTagsData = results[optIdx];
    for (const pt of postTagsData?.data || []) {
      if (pt.tag) {
        const existing = tagsMap.get(pt.post_id) || [];
        existing.push({ id: pt.tag.id, name: pt.tag.name });
        tagsMap.set(pt.post_id, existing);
      }
    }
    optIdx++;
  }

  let userBookmarkSet = new Set<string>();
  if (options?.includeBookmarks && userId) {
    const userBookmarksData = results[optIdx];
    userBookmarkSet = new Set((userBookmarksData?.data || []).map((b: any) => b.post_id));
  }

  return {
    likeCountMap,
    commentCountMap,
    reblogCountMap,
    userLikeSet: new Set((userLikesData.data || []).map((l: any) => l.post_id)),
    userCommentSet: new Set((userCommentsData.data || []).map((c: any) => c.post_id)),
    userReblogSet: new Set((userReblogsData.data || []).map((r: any) => r.reblogged_from_id)),
    userBookmarkSet,
    voiceCountMap,
    tagsMap,
  };
}
