"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconLoader2, IconMoodSad } from "@tabler/icons-react";
import {
  ProfileHeader,
  ProfileLinks,
  ProfileTabs,
  PinnedPost,
  type TabId,
} from "@/components/profile";
import { Post, ImageContent, TextContent } from "@/components/Post";
import {
  getProfileByUsername,
  getProfileStats,
  getProfileLinks,
  getCurrentProfile,
} from "@/actions/profile";
import { followUser, unfollowUser, isFollowing, blockUser, muteUser } from "@/actions/follows";

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

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const [error, setError] = useState<string | null>(null);

  // Demo pinned post
  const [pinnedPost] = useState({
    id: "pinned-1",
    author: { username: "demo", avatarUrl: "https://picsum.photos/seed/avatar1/200" },
    timestamp: "2 days ago",
    content: "This is my pinned post! Welcome to my profile.",
    imageUrl: "https://picsum.photos/seed/pinned/800/800",
  });

  // Demo posts for each tab
  const [posts] = useState([
    {
      id: "post-1",
      author: { username, avatarUrl: "https://picsum.photos/seed/avatar1/200" },
      timestamp: "3h ago",
      contentType: "image" as const,
      imageUrl: "https://picsum.photos/seed/post1/800/800",
      stats: { comments: 12, likes: 89, reblogs: 5 },
      interactions: { hasCommented: false, hasLiked: true, hasReblogged: false },
    },
    {
      id: "post-2",
      author: { username, avatarUrl: "https://picsum.photos/seed/avatar1/200" },
      timestamp: "1d ago",
      contentType: "text" as const,
      content: "Just sharing some thoughts on this beautiful day. The weather is perfect and I'm feeling inspired to create something new.",
      stats: { comments: 5, likes: 34, reblogs: 2 },
      interactions: { hasCommented: true, hasLiked: false, hasReblogged: false },
    },
  ]);

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

      // Check if own profile
      const currentProfileResult = await getCurrentProfile();
      if (currentProfileResult.success && currentProfileResult.profile) {
        setIsOwnProfile(currentProfileResult.profile.id === profileData.id);

        // Check if following
        if (currentProfileResult.profile.id !== profileData.id) {
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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile) return;
    const result = await followUser(profile.id);
    if (result.success) {
      setFollowing(true);
      setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    const result = await unfollowUser(profile.id);
    if (result.success) {
      setFollowing(false);
      setStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    await blockUser(profile.id);
    router.push("/feed");
  };

  const handleMute = async () => {
    if (!profile) return;
    await muteUser(profile.id);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
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
          counts={{
            posts: stats.posts,
            likes: 47, // Demo value
            comments: 23, // Demo value
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
                  <Post
                    id={pinnedPost.id}
                    author={{
                      username: profile.username,
                      avatarUrl: profile.avatarUrl || "https://picsum.photos/seed/default/200",
                    }}
                    timestamp={pinnedPost.timestamp}
                    contentType="image"
                    stats={{ comments: 24, likes: 156, reblogs: 12 }}
                    interactions={{ hasCommented: false, hasLiked: false, hasReblogged: false }}
                  >
                    <ImageContent src={pinnedPost.imageUrl} alt="" />
                  </Post>
                </PinnedPost>
              )}

              {/* Regular Posts */}
              {posts.map((post) => (
                <Post
                  key={post.id}
                  id={post.id}
                  author={post.author}
                  timestamp={post.timestamp}
                  contentType={post.contentType}
                  stats={post.stats}
                  interactions={post.interactions}
                >
                  {post.contentType === "image" && post.imageUrl ? (
                    <ImageContent src={post.imageUrl} alt="" />
                  ) : (
                    <TextContent>{post.content}</TextContent>
                  )}
                </Post>
              ))}
            </>
          )}

          {activeTab === "likes" && (
            <div className="text-center py-12">
              <p className="text-foreground/50">Liked posts will appear here</p>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="text-center py-12">
              <p className="text-foreground/50">Comments will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
