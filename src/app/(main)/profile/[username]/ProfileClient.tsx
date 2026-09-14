"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { IconLoader2 } from "@tabler/icons-react";
import {
  ProfileHeader,
  ProfileTabs,
  ProfileMasthead,
  FollowersModal,
  AvatarModal,
  AskModal,
  ProfileAccentScope,
  type TabId,
} from "@/components/profile";
import { ReportModal } from "@/components/moderation";
import { getFullProfile } from "@/actions/profile";
import { getLikedPosts, getCommentedPosts } from "@/actions/posts";
import { followUser, unfollowUser, blockUser, muteUser, isMutual } from "@/actions/follows";
import { startConversation } from "@/actions/messages";
import { toast } from "@/components/ui";

interface ProfileData {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  headerUrl?: string;
  bio?: string;
  showLikes: boolean;
  showComments: boolean;
  showFollowers: boolean;
  showFollowing: boolean;
  accentColor?: string | null;
  role: number;
  createdAt?: string;
  timezone?: string;
}

interface ProfileLink {
  id: string;
  title: string;
  url: string;
}

interface PostData {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  postType: string;
  content: any;
  isSensitive: boolean;
  isPinned: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  tags?: Array<{ id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Compact "front-page" tile helpers for the columnist's work (artboard 03).
// ---------------------------------------------------------------------------
const TYPE_KICKER: Record<string, string> = {
  text: "Note",
  image: "Photo",
  gallery: "Photo",
  video: "Video",
  audio: "Listen",
  poll: "Poll",
  ask: "Ask",
};

function stripHtml(html?: string): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function clamp(s: string, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}
function tileKicker(p: PostData): string {
  if (p.content?.is_essay) return "Essay";
  return TYPE_KICKER[p.postType] || "Note";
}
function tileHeadline(p: PostData): string {
  const c = p.content || {};
  if (c.essay_title) return c.essay_title;
  if (p.postType === "poll") return clamp(c.question || "A poll", 90);
  if (p.postType === "audio") return c.spotify_data?.name || (c.is_voice_note ? "Voice note" : "Audio");
  if (p.postType === "text") return clamp(c.plain || stripHtml(c.html), 90) || "Note";
  const cap = stripHtml(c.caption_html);
  return cap ? clamp(cap, 80) : `@${p.author.username}`;
}
function tileExcerpt(p: PostData): string {
  if (p.postType !== "text") return "";
  const body = stripHtml(p.content?.html) || p.content?.plain || "";
  return clamp(body, 140);
}
function tileThumb(p: PostData): string | null {
  const c = p.content || {};
  return c.urls?.[0] || c.thumbnail_url || c.album_art_url || null;
}
function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function ProfileClient() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, likes: 0, comments: 0 });
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [following, setFollowing] = useState(false);
  const [mutual, setMutual] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const [error, setError] = useState<string | null>(null);

  // Posts state
  const [posts, setPosts] = useState<PostData[]>([]);
  const [pinnedPost, setPinnedPost] = useState<PostData | null>(null);
  const [likedPosts, setLikedPosts] = useState<PostData[]>([]);
  const [commentedPosts, setCommentedPosts] = useState<PostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<"followers" | "following">("followers");
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [allowsAsks, setAllowsAsks] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getFullProfile(username);
      if (!result.success || !result.profile) {
        setError(result.error || "Profile not found");
        setIsLoading(false);
        return;
      }
      setProfile({
        id: result.profile.id,
        username: result.profile.username,
        displayName: result.profile.displayName,
        avatarUrl: result.profile.avatarUrl,
        headerUrl: result.profile.headerUrl,
        bio: result.profile.bio,
        showLikes: result.profile.showLikes,
        showComments: result.profile.showComments,
        showFollowers: result.profile.showFollowers,
        showFollowing: result.profile.showFollowing,
        accentColor: result.profile.accentColor ?? null,
        role: result.profile.role,
        createdAt: result.profile.createdAt,
        timezone: result.profile.timezone,
      });
      setIsOwnProfile(result.isOwnProfile || false);
      setCurrentUserId(result.currentUserId);
      setStats(result.stats || { posts: 0, followers: 0, following: 0, likes: 0, comments: 0 });
      setLikesCount(result.stats?.likes || 0);
      setCommentsCount(result.stats?.comments || 0);
      setLinks(result.links || []);
      setPosts(result.posts || []);
      setPinnedPost(result.pinnedPost || null);
      setFollowing(result.isFollowing || false);
      setAllowsAsks(result.canAsk || false);

      if (!result.isOwnProfile && result.profile.id) {
        isMutual(result.profile.id).then((mutualResult) => {
          if (mutualResult.success) setMutual(mutualResult.isMutual);
        });
      } else {
        setMutual(false);
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const fetchLikedPosts = useCallback(async () => {
    if (!profile) return;
    setPostsLoading(true);
    const result = await getLikedPosts(profile.id);
    if (result.success) {
      setLikedPosts(result.posts || []);
      setLikesCount(result.total || 0);
    }
    setPostsLoading(false);
  }, [profile]);

  const fetchCommentedPosts = useCallback(async () => {
    if (!profile) return;
    setPostsLoading(true);
    const result = await getCommentedPosts(profile.id);
    if (result.success) {
      setCommentedPosts(result.posts || []);
      setCommentsCount(result.total || 0);
    }
    setPostsLoading(false);
  }, [profile]);

  useEffect(() => {
    if (activeTab === "likes" && likedPosts.length === 0 && profile) fetchLikedPosts();
    if (activeTab === "comments" && commentedPosts.length === 0 && profile) fetchCommentedPosts();
  }, [activeTab, likedPosts.length, commentedPosts.length, profile, fetchLikedPosts, fetchCommentedPosts]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile) return;
    const result = await followUser(profile.id);
    if (result.success) {
      setFollowing(true);
      setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
      toast.success(`Subscribed to @${profile.username}`);
      isMutual(profile.id).then((mutualResult) => {
        if (mutualResult.success) setMutual(mutualResult.isMutual);
      });
    } else {
      toast.error(result.error || "Failed to subscribe");
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    const result = await unfollowUser(profile.id);
    if (result.success) {
      setFollowing(false);
      setMutual(false);
      setStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
      toast.success(`Unsubscribed from @${profile.username}`);
    } else {
      toast.error(result.error || "Failed to unsubscribe");
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    const result = await blockUser(profile.id);
    if (result.success) {
      toast.success(`Blocked @${profile.username}`);
      router.push("/feed");
    } else {
      toast.error(result.error || "Failed to block user");
    }
  };

  const handleMute = async () => {
    if (!profile) return;
    const result = await muteUser(profile.id);
    if (result.success) toast.success(`Muted @${profile.username}`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied!");
  };

  const openFollowersModal = (type: "followers" | "following") => {
    setFollowersModalType(type);
    setFollowersModalOpen(true);
  };

  // Compact front-page tile for a post.
  const renderTile = (post: PostData) => {
    const thumb = tileThumb(post);
    const excerpt = tileExcerpt(post);
    return (
      <Link
        key={post.id}
        href={`/post/${post.id}`}
        className="group block border-b border-rule py-5"
      >
        <div className="kicker mb-2">{tileKicker(post)}</div>
        {thumb && (
          <div className="relative mb-3 aspect-[3/2] w-full overflow-hidden bg-panel">
            <Image src={thumb} alt="" fill sizes="(max-width:1024px) 100vw, 40vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          </div>
        )}
        <h3 className="type-heading text-ink transition-colors group-hover:text-accent">{tileHeadline(post)}</h3>
        {excerpt && <p className="editorial-body mt-1.5 line-clamp-2 text-[0.95rem] text-editorial-body">{excerpt}</p>}
        <div className="byline mt-2 text-meta">
          {shortDate(post.createdAt)}
          {post.likeCount > 0 && ` · ${post.likeCount} likes`}
          {post.commentCount > 0 && ` · ${post.commentCount} comments`}
        </div>
      </Link>
    );
  };

  const tileGrid = (list: PostData[]) => (
    <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">{list.map(renderTile)}</div>
  );

  const emptyNote = (text: string) => (
    <div className="py-16 text-center">
      <p className="slug text-meta-dim mb-3">Nothing in print</p>
      <p className="editorial-body text-meta">{text}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IconLoader2 size={40} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <p className="slug text-meta-dim mb-4">Profile</p>
        <h1 className="type-display text-ink mb-3">{error || "No such columnist."}</h1>
        <p className="editorial-body text-meta max-w-[52ch] mb-6">
          The profile you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/feed")}
          className="px-6 py-2.5 bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs hover:opacity-[0.88] transition-opacity"
        >
          Go to feed
        </button>
      </div>
    );
  }

  // Rail facts derived from the columnist's posts.
  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-AU", { month: "short", year: "numeric" })
    : undefined;
  const typeCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  posts.forEach((p) => {
    const k = TYPE_KICKER[p.postType] || "Note";
    typeCounts[k] = (typeCounts[k] || 0) + 1;
    p.tags?.forEach((t) => (tagCounts[t.name] = (tagCounts[t.name] || 0) + 1));
  });
  const mostly = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k).join(" · ") || undefined;
  const sections = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);

  return (
    <ProfileAccentScope accent={profile.accentColor}>
      <div className="min-h-screen pb-24">
        <title>{`@${profile.username} | be.vocl`}</title>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Banner — always present, 6:1 */}
          <div className="relative mt-6 aspect-[6/1] w-full overflow-hidden border-b border-rule">
            {profile.headerUrl ? (
              <Image src={profile.headerUrl} alt="" fill sizes="100vw" quality={85} className="object-cover" priority />
            ) : (
              <div className="ph-image absolute inset-0" aria-hidden="true" />
            )}
          </div>

          {/* Two-column: main column + right Masthead rail */}
          <div className="grid grid-cols-1 gap-10 pt-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {/* MAIN */}
            <div className="min-w-0">
              <ProfileHeader
                username={profile.username}
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                bio={profile.bio}
                isOwnProfile={isOwnProfile}
                isFollowing={following}
                isMutual={mutual}
                role={profile.role}
                joinedYear={profile.createdAt ? new Date(profile.createdAt).getFullYear() : undefined}
                location={profile.timezone}
                allowsAsks={allowsAsks}
                stats={stats}
                onStatClick={(stat) => {
                  if (stat === "posts") setActiveTab("posts");
                  else openFollowersModal(stat);
                }}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                onSettings={() => router.push("/settings")}
                onBlock={handleBlock}
                onMute={handleMute}
                onShare={handleShare}
                onMessage={async () => {
                  const result = await startConversation(profile.id);
                  if (result.success && result.conversationId) {
                    window.dispatchEvent(
                      new CustomEvent("vocl:open-conversation", {
                        detail: { conversationId: result.conversationId },
                      }),
                    );
                  } else {
                    toast.error(result.error || "Could not start conversation");
                  }
                }}
                onAsk={() => setAskModalOpen(true)}
                onReport={() => setReportModalOpen(true)}
                onAvatarClick={() => setAvatarModalOpen(true)}
              />

              <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showLikes={profile.showLikes || isOwnProfile}
                showComments={profile.showComments || isOwnProfile}
                showFollowers={profile.showFollowers || isOwnProfile}
                showFollowing={profile.showFollowing || isOwnProfile}
                counts={{
                  posts: stats.posts,
                  likes: likesCount,
                  comments: commentsCount,
                  followers: stats.followers,
                  following: stats.following,
                }}
              />

              <div className="mt-2">
                {activeTab === "posts" && (
                  <>
                    {pinnedPost && (
                      <Link href={`/post/${pinnedPost.id}`} className="group block border-b border-rule pb-6">
                        <div className="kicker kicker-accent mb-2.5">Pinned</div>
                        <h2 className="type-display text-ink transition-colors group-hover:text-accent">
                          {tileHeadline(pinnedPost)}
                        </h2>
                        {tileExcerpt(pinnedPost) && (
                          <p className="editorial-body mt-2.5 max-w-[62ch] text-editorial-body">{tileExcerpt(pinnedPost)}</p>
                        )}
                        <div className="byline mt-2.5 text-meta">
                          {shortDate(pinnedPost.createdAt)}
                          {pinnedPost.likeCount > 0 && ` · ${pinnedPost.likeCount} likes`}
                          {pinnedPost.commentCount > 0 && ` · ${pinnedPost.commentCount} comments`}
                        </div>
                      </Link>
                    )}
                    {posts.length > 0
                      ? tileGrid(posts)
                      : emptyNote(isOwnProfile ? "You haven't filed anything yet." : "This columnist hasn't filed anything the public can read.")}
                  </>
                )}

                {activeTab === "likes" &&
                  (postsLoading ? (
                    <div className="flex justify-center py-12"><IconLoader2 size={32} className="animate-spin text-accent" /></div>
                  ) : likedPosts.length > 0 ? (
                    tileGrid(likedPosts)
                  ) : (
                    emptyNote("No liked posts yet.")
                  ))}

                {activeTab === "comments" &&
                  (postsLoading ? (
                    <div className="flex justify-center py-12"><IconLoader2 size={32} className="animate-spin text-accent" /></div>
                  ) : commentedPosts.length > 0 ? (
                    tileGrid(commentedPosts)
                  ) : (
                    emptyNote("No commented posts yet.")
                  ))}

                {activeTab === "followers" && (
                  <FollowersListTab userId={profile.id} type="followers" currentUserId={currentUserId} />
                )}
                {activeTab === "following" && (
                  <FollowersListTab userId={profile.id} type="following" currentUserId={currentUserId} />
                )}
              </div>
            </div>

            {/* RAIL */}
            <aside className="lg:border-l lg:border-rule lg:pl-8">
              <ProfileMasthead joined={joined} mostly={mostly} sections={sections} links={links} />
            </aside>
          </div>
        </div>

        {/* Modals */}
        <FollowersModal
          isOpen={followersModalOpen}
          onClose={() => setFollowersModalOpen(false)}
          type={followersModalType}
          userId={profile.id}
          username={profile.username}
          currentUserId={currentUserId}
        />
        <AvatarModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          avatarUrl={profile.avatarUrl}
          username={profile.username}
        />
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportedUserId={profile.id}
          reportedUsername={profile.username}
        />
        <AskModal
          isOpen={askModalOpen}
          onClose={() => setAskModalOpen(false)}
          recipientUsername={profile.username}
          recipientDisplayName={profile.displayName}
        />
      </div>
    </ProfileAccentScope>
  );
}

// Inline component for followers/following tab content
function FollowersListTab({
  userId,
  type,
  currentUserId,
}: {
  userId: string;
  type: "followers" | "following";
  currentUserId?: string;
}) {
  const [users, setUsers] = useState<Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  }>>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const { getFollowers, getFollowing, batchIsFollowing } = await import("@/actions/follows");
        const result = type === "followers" ? await getFollowers(userId) : await getFollowing(userId);
        if (result.success) {
          const userList = type === "followers"
            ? (result as { followers?: typeof users }).followers
            : (result as { following?: typeof users }).following;
          const fetchedUsers = userList || [];
          setUsers(fetchedUsers);
          if (currentUserId && fetchedUsers.length > 0) {
            const userIds = fetchedUsers.filter((u) => u.id !== currentUserId).map((u) => u.id);
            if (userIds.length > 0) {
              const followingResult = await batchIsFollowing(userIds);
              setFollowingSet(followingResult);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [userId, type, currentUserId]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><IconLoader2 size={32} className="animate-spin text-accent" /></div>;
  }
  if (users.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="editorial-body text-meta">{type === "followers" ? "No subscribers yet." : "Not following anyone yet."}</p>
      </div>
    );
  }
  return (
    <div>
      {users.map((user) => (
        <FollowerCard key={user.id} user={user} currentUserId={currentUserId} initialIsFollowing={followingSet.has(user.id)} />
      ))}
    </div>
  );
}

function FollowerCard({
  user,
  currentUserId,
  initialIsFollowing = false,
}: {
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null; bio: string | null };
  currentUserId?: string;
  initialIsFollowing?: boolean;
}) {
  const [isFollowingUser, setIsFollowingUser] = useState(initialIsFollowing);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const isOwnCard = currentUserId === user.id;

  const handleFollowToggle = async () => {
    if (isOwnCard) return;
    setIsLoadingFollow(true);
    try {
      const { followUser, unfollowUser } = await import("@/actions/follows");
      if (isFollowingUser) {
        const result = await unfollowUser(user.id);
        if (result.success) {
          setIsFollowingUser(false);
          toast.success(`Unsubscribed from @${user.username}`);
        }
      } else {
        const result = await followUser(user.id);
        if (result.success) {
          setIsFollowingUser(true);
          toast.success(`Subscribed to @${user.username}`);
        }
      }
    } finally {
      setIsLoadingFollow(false);
    }
  };

  return (
    <Link href={`/profile/${user.username}`} className="flex items-center gap-3 border-b border-rule py-3 hover:bg-vocl-hover transition-colors">
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-none">
        {user.avatarUrl ? (
          <Image src={user.avatarUrl} alt={user.username} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-panel">
            <span className="font-display text-lg text-ink">{user.username.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ink">{user.displayName || user.username}</p>
        <p className="byline mt-0.5 truncate text-meta">@{user.username}</p>
        {user.bio && <p className="editorial-caption mt-1 line-clamp-1 text-caption not-italic">{user.bio}</p>}
      </div>
      {!isOwnCard && currentUserId && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFollowToggle();
          }}
          disabled={isLoadingFollow}
          className={`flex-shrink-0 border px-4 py-1.5 font-sans font-medium uppercase tracking-[0.16em] text-[11px] transition-colors ${
            isFollowingUser ? "border-foreground text-ink hover:bg-vocl-hover" : "border-accent text-accent hover:bg-accent/10"
          }`}
        >
          {isLoadingFollow ? <IconLoader2 size={16} className="animate-spin" /> : isFollowingUser ? "Subscribing" : "Subscribe"}
        </button>
      )}
    </Link>
  );
}
