"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { IconLoader2, IconMoodSad } from "@tabler/icons-react";
import {
  ProfileHeader,
  ProfileLinks,
  ProfileTabs,
  PinnedPost,
  FollowersModal,
  AvatarModal,
  type TabId,
} from "@/components/profile";
import { InteractivePost, ImageContent, TextContent } from "@/components/Post";
import {
  getProfileByUsername,
  getProfileStats,
  getProfileLinks,
  getCurrentProfile,
} from "@/actions/profile";
import { getPostsByUser, getLikedPosts } from "@/actions/posts";
import { followUser, unfollowUser, isFollowing, blockUser, muteUser } from "@/actions/follows";
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
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const [error, setError] = useState<string | null>(null);

  // Posts state
  const [posts, setPosts] = useState<PostData[]>([]);
  const [pinnedPost, setPinnedPost] = useState<PostData | null>(null);
  const [likedPosts, setLikedPosts] = useState<PostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  // Followers modal state (for stat clicks in header)
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<"followers" | "following">("followers");

  // Avatar modal state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile data
      const profileResult = await getProfileByUsername(username);
      if (!profileResult.success || !profileResult.profile) {
        setError("Profile not found");
        setIsLoading(false);
        return;
      }

      const profileData = profileResult.profile;
      setProfile({
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.displayName,
        avatarUrl: profileData.avatarUrl,
        headerUrl: profileData.headerUrl,
        bio: profileData.bio,
        showLikes: profileData.showLikes,
        showComments: profileData.showComments,
        showFollowers: profileData.showFollowers,
        showFollowing: profileData.showFollowing,
      });

      // Fetch stats
      const statsResult = await getProfileStats(profileData.id);
      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }

      // Fetch links
      const linksResult = await getProfileLinks(profileData.id);
      if (linksResult.success && linksResult.links) {
        setLinks(linksResult.links);
      }

      // Fetch posts
      const postsResult = await getPostsByUser(profileData.id, { includePinned: true });
      if (postsResult.success) {
        setPosts(postsResult.posts || []);
        setPinnedPost(postsResult.pinnedPost || null);
      }

      // Check if own profile
      const currentProfileResult = await getCurrentProfile();
      if (currentProfileResult.success && currentProfileResult.profile) {
        const isOwn = currentProfileResult.profile.id === profileData.id;
        setIsOwnProfile(isOwn);
        setCurrentUserId(currentProfileResult.profile.id);

        // Check if following
        if (!isOwn) {
          const isFollowingResult = await isFollowing(profileData.id);
          setFollowing(isFollowingResult);
        }
      }
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  // Fetch liked posts when switching to likes tab
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

  useEffect(() => {
    if (activeTab === "likes" && likedPosts.length === 0 && profile) {
      fetchLikedPosts();
    }
  }, [activeTab, likedPosts.length, profile, fetchLikedPosts]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile) return;
    const result = await followUser(profile.id);
    if (result.success) {
      setFollowing(true);
      setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
      toast.success(`Following @${profile.username}`);
    } else {
      toast.error(result.error || "Failed to follow user");
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    const result = await unfollowUser(profile.id);
    if (result.success) {
      setFollowing(false);
      setStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
      toast.success(`Unfollowed @${profile.username}`);
    } else {
      toast.error(result.error || "Failed to unfollow user");
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
    if (result.success) {
      toast.success(`Muted @${profile.username}`);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied!");
  };

  const openFollowersModal = (type: "followers" | "following") => {
    setFollowersModalType(type);
    setFollowersModalOpen(true);
  };

  // Render a post
  const renderPost = (post: PostData) => {
    const contentType = post.postType as "text" | "image" | "video" | "audio" | "gallery";

    // Get content preview for reblog dialog
    const contentPreview = post.content?.plain || post.content?.caption_html?.replace(/<[^>]*>/g, "") || "";
    const imageUrl = post.content?.urls?.[0] || post.content?.thumbnail_url;

    return (
      <InteractivePost
        key={post.id}
        id={post.id}
        author={{
          username: post.author.username,
          avatarUrl: post.author.avatarUrl || "https://via.placeholder.com/100",
        }}
        authorId={post.authorId}
        timestamp={post.createdAt}
        contentType={contentType}
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
        isOwn={post.authorId === currentUserId}
        isPinned={post.isPinned}
        contentPreview={contentPreview}
        imageUrl={imageUrl}
      >
        {contentType === "image" && post.content?.urls?.[0] && (
          <ImageContent src={post.content.urls[0]} alt="" />
        )}
        {contentType === "text" && post.content?.html && (
          <TextContent>
            <div dangerouslySetInnerHTML={{ __html: post.content.html }} />
          </TextContent>
        )}
        {contentType === "text" && post.content?.plain && !post.content?.html && (
          <TextContent>{post.content.plain}</TextContent>
        )}
      </InteractivePost>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IconLoader2 size={40} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <IconMoodSad size={40} className="text-foreground/30" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {error || "Profile not found"}
        </h1>
        <p className="text-foreground/50 mb-6">
          The profile you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/feed")}
          className="px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors"
        >
          Go to feed
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Profile Header */}
      <ProfileHeader
        username={profile.username}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        headerUrl={profile.headerUrl}
        bio={profile.bio}
        stats={stats}
        isOwnProfile={isOwnProfile}
        isFollowing={following}
        showFollowers={profile.showFollowers || isOwnProfile}
        showFollowing={profile.showFollowing || isOwnProfile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onSettings={() => router.push("/settings")}
        onBlock={handleBlock}
        onMute={handleMute}
        onShare={handleShare}
        onFollowersClick={() => openFollowersModal("followers")}
        onFollowingClick={() => openFollowersModal("following")}
        onAvatarClick={() => setAvatarModalOpen(true)}
      />

      {/* Profile Links */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto">
        <ProfileLinks links={links} />
      </div>

      {/* Profile Tabs */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto">
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
      </div>

      {/* Tab Content */}
      <div className="mt-6 px-4 sm:px-6">
        <div className="max-w-sm mx-auto space-y-6">
          {activeTab === "posts" && (
            <>
              {/* Pinned Post */}
              {pinnedPost && (
                <PinnedPost>
                  {renderPost(pinnedPost)}
                </PinnedPost>
              )}

              {/* Regular Posts */}
              {posts.length > 0 ? (
                posts.map((post) => renderPost(post))
              ) : (
                <div className="text-center py-12">
                  <p className="text-foreground/50">
                    {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "likes" && (
            <>
              {postsLoading ? (
                <div className="flex justify-center py-12">
                  <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
                </div>
              ) : likedPosts.length > 0 ? (
                likedPosts.map((post) => renderPost(post))
              ) : (
                <div className="text-center py-12">
                  <p className="text-foreground/50">No liked posts yet</p>
                </div>
              )}
            </>
          )}

          {activeTab === "comments" && (
            <div className="text-center py-12">
              <p className="text-foreground/50">Comments feature coming soon</p>
            </div>
          )}

          {activeTab === "followers" && (
            <FollowersListTab
              userId={profile.id}
              type="followers"
              currentUserId={currentUserId}
            />
          )}

          {activeTab === "following" && (
            <FollowersListTab
              userId={profile.id}
              type="following"
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>

      {/* Followers/Following Modal (for stat clicks) */}
      {profile && (
        <FollowersModal
          isOpen={followersModalOpen}
          onClose={() => setFollowersModalOpen(false)}
          type={followersModalType}
          userId={profile.id}
          username={profile.username}
          currentUserId={currentUserId}
        />
      )}

      {/* Avatar Modal */}
      {profile && (
        <AvatarModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          avatarUrl={profile.avatarUrl}
          username={profile.username}
        />
      )}
    </div>
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const { getFollowers, getFollowing } = await import("@/actions/follows");
        const result = type === "followers"
          ? await getFollowers(userId)
          : await getFollowing(userId);
        if (result.success) {
          const userList = type === "followers"
            ? (result as { followers?: typeof users }).followers
            : (result as { following?: typeof users }).following;
          setUsers(userList || []);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [userId, type]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground/50">
          {type === "followers" ? "No followers yet" : "Not following anyone yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <FollowerCard key={user.id} user={user} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

// Inline component for individual follower/following card
function FollowerCard({
  user,
  currentUserId,
}: {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
  currentUserId?: string;
}) {
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const isOwnCard = currentUserId === user.id;

  useEffect(() => {
    const checkFollowing = async () => {
      if (!currentUserId || isOwnCard) return;
      const { isFollowing } = await import("@/actions/follows");
      const result = await isFollowing(user.id);
      setIsFollowingUser(result);
    };
    checkFollowing();
  }, [currentUserId, user.id, isOwnCard]);

  const handleFollowToggle = async () => {
    if (isOwnCard) return;
    setIsLoadingFollow(true);
    try {
      const { followUser, unfollowUser } = await import("@/actions/follows");
      if (isFollowingUser) {
        const result = await unfollowUser(user.id);
        if (result.success) {
          setIsFollowingUser(false);
          toast.success(`Unfollowed @${user.username}`);
        }
      } else {
        const result = await followUser(user.id);
        if (result.success) {
          setIsFollowingUser(true);
          toast.success(`Following @${user.username}`);
        }
      }
    } finally {
      setIsLoadingFollow(false);
    }
  };

  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
    >
      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.username}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
            <span className="text-lg font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {user.displayName || user.username}
        </p>
        <p className="text-sm text-foreground/50 truncate">@{user.username}</p>
        {user.bio && (
          <p className="text-sm text-foreground/60 mt-1 line-clamp-1">{user.bio}</p>
        )}
      </div>
      {!isOwnCard && currentUserId && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFollowToggle();
          }}
          disabled={isLoadingFollow}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
            isFollowingUser
              ? "bg-white/10 text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
              : "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
          }`}
        >
          {isLoadingFollow ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : isFollowingUser ? (
            "Following"
          ) : (
            "Follow"
          )}
        </button>
      )}
    </Link>
  );
}
