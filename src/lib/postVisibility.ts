/**
 * The single source of truth for "may a logged-out visitor see this post?".
 *
 * The same rules were previously enforced only in the front-page/discover feed
 * and the sitemap, and were missing (or partial) on /embed, getPostById, the
 * public profile, and the archive — which leaked opted-out, sensitive, and
 * moderator-removed posts. Every public read path should now agree by routing
 * through here.
 */

export interface VisibilityPost {
  status?: string | null;
  moderation_status?: string | null;
  is_sensitive?: boolean | null;
  exclude_from_public?: boolean | null;
}

export interface VisibilityAuthor {
  is_discoverable?: boolean | null;
  lock_status?: string | null;
}

/** True only if the post is safe to show on a fully public surface (embed,
 *  logged-out post page, public profile, front page). */
export function isPubliclyViewable(
  post: VisibilityPost,
  author: VisibilityAuthor | null | undefined
): boolean {
  if (!author) return false;
  if (post.status !== "published") return false;
  if (post.moderation_status !== "approved") return false;
  if (post.is_sensitive === true) return false;
  if (post.exclude_from_public === true) return false;
  if (author.is_discoverable === false) return false;
  if (author.lock_status === "restricted" || author.lock_status === "banned") return false;
  return true;
}

/** True if the post has been withheld by moderation (removed / held / pending)
 *  and must not be served to non-owners on ANY surface — even members-only ones
 *  like the archive where exclude_from_public isn't filtered. */
export function isModerationHidden(post: VisibilityPost): boolean {
  return post.moderation_status !== "approved";
}
