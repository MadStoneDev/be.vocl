/**
 * Shared helper: batch-fetch engagement stats & user interactions for a set of post IDs.
 * Used by posts.ts and recommendations.ts to avoid duplicating this logic.
 * NOT a server action - imported by server action files.
 *
 * Optimized: Uses per-post count queries (head: true) instead of fetching all rows.
 * For 20 posts with 50 likes each, this transfers 20 counts instead of 1000 rows.
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
      tagsMap: new Map<string, Array<{ id: string; name: string }>>(),
    };
  }

  // Build all queries in parallel - use count queries for totals, row queries only for user interactions
  const queries: Promise<any>[] = [
    // Count queries: use individual count per post for accurate counts without fetching rows
    ...postIds.map((id) =>
      supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", id)
    ),
    ...postIds.map((id) =>
      supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id)
    ),
    ...postIds.map((id) =>
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("reblogged_from_id", id).eq("status", "published")
    ),
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

  // Parse count results (3 groups of postIds.length)
  const n = postIds.length;
  const likeCountMap = new Map<string, number>();
  const commentCountMap = new Map<string, number>();
  const reblogCountMap = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    likeCountMap.set(postIds[i], results[i].count || 0);
    commentCountMap.set(postIds[i], results[n + i].count || 0);
    reblogCountMap.set(postIds[i], results[2 * n + i].count || 0);
  }

  // Parse user interaction results
  const userLikesData = results[3 * n];
  const userCommentsData = results[3 * n + 1];
  const userReblogsData = results[3 * n + 2];

  // Parse optional results
  const tagsMap = new Map<string, Array<{ id: string; name: string }>>();
  let optIdx = 3 * n + 3;
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
    tagsMap,
  };
}
