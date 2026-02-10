/**
 * Shared helper: batch-fetch engagement stats & user interactions for a set of post IDs.
 * Used by posts.ts and recommendations.ts to avoid duplicating this logic.
 * NOT a server action - imported by server action files.
 */
export async function batchFetchPostStats(
  supabase: any,
  postIds: string[],
  userId?: string,
  options?: { includeTags?: boolean }
) {
  if (postIds.length === 0) {
    return {
      likeCountMap: new Map<string, number>(),
      commentCountMap: new Map<string, number>(),
      reblogCountMap: new Map<string, number>(),
      userLikeSet: new Set<string>(),
      userCommentSet: new Set<string>(),
      userReblogSet: new Set<string>(),
      tagsMap: new Map<string, Array<{ id: string; name: string }>>(),
    };
  }

  const queries: Promise<any>[] = [
    supabase.from("likes").select("post_id").in("post_id", postIds),
    supabase.from("comments").select("post_id").in("post_id", postIds),
    supabase.from("posts").select("reblogged_from_id").in("reblogged_from_id", postIds).eq("status", "published"),
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

  const [likeCounts, commentCounts, reblogCounts, userLikesData, userCommentsData, userReblogsData, postTagsData] =
    await Promise.all(queries);

  const likeCountMap = new Map<string, number>();
  const commentCountMap = new Map<string, number>();
  const reblogCountMap = new Map<string, number>();
  const tagsMap = new Map<string, Array<{ id: string; name: string }>>();

  for (const l of likeCounts.data || []) {
    likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
  }
  for (const c of commentCounts.data || []) {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
  }
  for (const r of reblogCounts.data || []) {
    reblogCountMap.set(r.reblogged_from_id, (reblogCountMap.get(r.reblogged_from_id) || 0) + 1);
  }
  if (postTagsData) {
    for (const pt of postTagsData.data || []) {
      if (pt.tag) {
        const existing = tagsMap.get(pt.post_id) || [];
        existing.push({ id: pt.tag.id, name: pt.tag.name });
        tagsMap.set(pt.post_id, existing);
      }
    }
  }

  return {
    likeCountMap,
    commentCountMap,
    reblogCountMap,
    userLikeSet: new Set((userLikesData.data || []).map((l: any) => l.post_id)),
    userCommentSet: new Set((userCommentsData.data || []).map((c: any) => c.post_id)),
    userReblogSet: new Set((userReblogsData.data || []).map((r: any) => r.reblogged_from_id)),
    tagsMap,
  };
}
