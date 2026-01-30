"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  IconSearch,
  IconLoader2,
  IconUser,
  IconHash,
  IconFileText,
  IconAlertTriangle,
  IconTrendingUp,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import {
  searchUsers,
  searchTags,
  searchPosts,
  checkSensitiveSearch,
  getTrendingTags,
  getSuggestedUsers,
  getPostsByTag,
  type SearchResult,
} from "@/actions/search";
import { followUser, unfollowUser } from "@/actions/follows";
import { toast } from "@/components/ui";
import { InteractivePost, ImageContent, TextContent } from "@/components/Post";

type SearchTab = "all" | "users" | "tags" | "posts";

function SearchLoading() {
  return (
    <div className="py-6 max-w-2xl mx-auto">
      <div className="animate-pulse">
        <div className="h-12 bg-white/10 rounded-xl mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTab = (searchParams.get("tab") as SearchTab) || "all";
  const tagParam = searchParams.get("tag");

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [isSearching, setIsSearching] = useState(false);

  // Results
  const [users, setUsers] = useState<SearchResult["users"]>([]);
  const [tags, setTags] = useState<SearchResult["tags"]>([]);
  const [posts, setPosts] = useState<SearchResult["posts"]>([]);

  // Counts
  const [userCount, setUserCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

  // Sensitive content warning
  const [showSensitiveWarning, setShowSensitiveWarning] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  const [sensitiveConfirmed, setSensitiveConfirmed] = useState(false);

  // Discovery content
  const [trendingTags, setTrendingTags] = useState<SearchResult["tags"]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchResult["users"]>([]);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(true);

  // Tag browsing
  const [browsingTag, setBrowsingTag] = useState<{
    id: string;
    name: string;
    postCount: number;
  } | null>(null);

  // Load discovery content on mount
  useEffect(() => {
    const loadDiscovery = async () => {
      setIsLoadingDiscovery(true);
      const [tagsResult, usersResult] = await Promise.all([
        getTrendingTags(10),
        getSuggestedUsers(5),
      ]);

      if (tagsResult.success && tagsResult.tags) {
        setTrendingTags(tagsResult.tags);
      }
      if (usersResult.success && usersResult.users) {
        setSuggestedUsers(usersResult.users);
      }
      setIsLoadingDiscovery(false);
    };

    loadDiscovery();
  }, []);

  // Handle tag param on mount
  useEffect(() => {
    if (tagParam) {
      handleTagClick(tagParam);
    }
  }, [tagParam]);

  const performSearch = useCallback(
    async (searchQuery: string, forceIncludeSensitive = false) => {
      if (!searchQuery.trim()) {
        setUsers([]);
        setTags([]);
        setPosts([]);
        setUserCount(0);
        setTagCount(0);
        setPostCount(0);
        return;
      }

      setIsSearching(true);

      // Determine search type based on prefix
      const isUserSearch = searchQuery.startsWith("@");
      const isTagSearch = searchQuery.startsWith("#");

      // Check for sensitive content if not confirmed
      if (!forceIncludeSensitive && !sensitiveConfirmed) {
        const { isSensitive, userAllowsSensitive } = await checkSensitiveSearch(searchQuery);
        if (isSensitive && !userAllowsSensitive) {
          setShowSensitiveWarning(true);
          setPendingQuery(searchQuery);
          setIsSearching(false);
          return;
        }
      }

      try {
        if (isUserSearch || activeTab === "users") {
          const result = await searchUsers(searchQuery);
          if (result.success) {
            setUsers(result.users || []);
            setUserCount(result.total || 0);
          }
          if (isUserSearch) {
            setTags([]);
            setPosts([]);
            setTagCount(0);
            setPostCount(0);
          }
        }

        if (isTagSearch || activeTab === "tags") {
          const result = await searchTags(searchQuery);
          if (result.success) {
            setTags(result.tags || []);
            setTagCount(result.total || 0);
          }
          if (isTagSearch) {
            setUsers([]);
            setPosts([]);
            setUserCount(0);
            setPostCount(0);
          }
        }

        if (!isUserSearch && !isTagSearch && (activeTab === "all" || activeTab === "posts")) {
          const [usersResult, tagsResult, postsResult] = await Promise.all([
            activeTab === "all" ? searchUsers(searchQuery, { limit: 5 }) : Promise.resolve({ success: true, users: [], total: 0 }),
            activeTab === "all" ? searchTags(searchQuery, { limit: 5 }) : Promise.resolve({ success: true, tags: [], total: 0 }),
            searchPosts(searchQuery, { includeSensitive: forceIncludeSensitive }),
          ]);

          if (usersResult.success) {
            setUsers(usersResult.users || []);
            setUserCount(usersResult.total || 0);
          }
          if (tagsResult.success) {
            setTags(tagsResult.tags || []);
            setTagCount(tagsResult.total || 0);
          }
          if (postsResult.success) {
            setPosts(postsResult.posts || []);
            setPostCount(postsResult.total || 0);
          }
        }
      } catch (error) {
        toast.error("Search failed");
      } finally {
        setIsSearching(false);
      }
    },
    [activeTab, sensitiveConfirmed]
  );

  // Search on query change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && !browsingTag) {
        performSearch(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch, browsingTag]);

  const handleTagClick = async (tagName: string) => {
    setQuery("");
    setIsSearching(true);

    const result = await getPostsByTag(tagName);
    if (result.success) {
      setBrowsingTag(result.tag || null);
      setPosts(result.posts || []);
      setPostCount(result.total || 0);
      setUsers([]);
      setTags([]);
      setUserCount(0);
      setTagCount(0);
    }

    setIsSearching(false);
  };

  const handleSensitiveConfirm = () => {
    setShowSensitiveWarning(false);
    setSensitiveConfirmed(true);
    performSearch(pendingQuery, true);
  };

  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    const result = isFollowing ? await unfollowUser(userId) : await followUser(userId);

    if (result.success) {
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: !isFollowing } : u))
      );
      setSuggestedUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: !isFollowing } : u))
      );
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    }
  };

  const clearTagBrowsing = () => {
    setBrowsingTag(null);
    setPosts([]);
    setPostCount(0);
  };

  const hasResults = users.length > 0 || tags.length > 0 || posts.length > 0;
  const showDiscovery = !query && !browsingTag && !isSearching;

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative mb-6">
        <IconSearch
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setBrowsingTag(null);
          }}
          placeholder="Search @users, #tags, or posts..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent"
        />
        {(query || browsingTag) && (
          <button
            onClick={() => {
              setQuery("");
              clearTagBrowsing();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
          >
            <IconX size={20} />
          </button>
        )}
      </div>

      {/* Sensitive Content Warning Modal */}
      {showSensitiveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-vocl-surface-dark rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <IconAlertTriangle size={24} className="text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Sensitive Content Warning</h3>
                <p className="text-sm text-foreground/60">This search may contain adult content</p>
              </div>
            </div>
            <p className="text-foreground/70 mb-6">
              Some content from this search may be sensitive. Do you want to continue with this search anyway?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSensitiveWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-foreground font-medium hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSensitiveConfirm}
                className="flex-1 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browsing Tag Header */}
      {browsingTag && (
        <div className="mb-6 p-4 rounded-xl bg-vocl-accent/10 border border-vocl-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <IconHash size={20} className="text-vocl-accent" />
                <span className="text-lg font-semibold text-foreground">
                  {browsingTag.name}
                </span>
              </div>
              <p className="text-sm text-foreground/60 mt-1">
                {browsingTag.postCount.toLocaleString()} posts
              </p>
            </div>
            <button
              onClick={clearTagBrowsing}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <IconX size={20} className="text-foreground/60" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs (when searching) */}
      {query && !browsingTag && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["all", "users", "tags", "posts"] as const).map((tab) => {
            const counts = {
              all: userCount + tagCount + postCount,
              users: userCount,
              tags: tagCount,
              posts: postCount,
            };
            const icons = {
              all: IconSearch,
              users: IconUser,
              tags: IconHash,
              posts: IconFileText,
            };
            const Icon = icons[tab];

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-vocl-accent text-white"
                    : "bg-white/5 text-foreground/70 hover:bg-white/10"
                }`}
              >
                <Icon size={16} />
                <span className="capitalize">{tab}</span>
                {counts[tab] > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab ? "bg-white/20" : "bg-white/10"
                  }`}>
                    {counts[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="flex justify-center py-12">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      )}

      {/* Discovery Content */}
      {showDiscovery && (
        <div className="space-y-8">
          {/* Trending Tags */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <IconTrendingUp size={20} className="text-vocl-accent" />
              <h2 className="text-lg font-semibold text-foreground">Trending Tags</h2>
            </div>
            {isLoadingDiscovery ? (
              <div className="flex justify-center py-6">
                <IconLoader2 size={24} className="animate-spin text-foreground/40" />
              </div>
            ) : trendingTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag.name)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <IconHash size={14} className="text-vocl-accent" />
                    <span className="text-sm text-foreground">{tag.name}</span>
                    <span className="text-xs text-foreground/40">{tag.postCount}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-foreground/50 text-sm">No trending tags yet</p>
            )}
          </section>

          {/* Suggested Users */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <IconUserPlus size={20} className="text-vocl-accent" />
              <h2 className="text-lg font-semibold text-foreground">Who to Follow</h2>
            </div>
            {isLoadingDiscovery ? (
              <div className="flex justify-center py-6">
                <IconLoader2 size={24} className="animate-spin text-foreground/40" />
              </div>
            ) : suggestedUsers.length > 0 ? (
              <div className="space-y-2">
                {suggestedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onFollowToggle={() => handleFollowToggle(user.id, user.isFollowing)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-foreground/50 text-sm">No suggestions available</p>
            )}
          </section>
        </div>
      )}

      {/* Search Results */}
      {!isSearching && !showDiscovery && (
        <div className="space-y-6">
          {/* Users */}
          {users.length > 0 && (activeTab === "all" || activeTab === "users") && (
            <section>
              {activeTab === "all" && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Users</h3>
                  {userCount > 5 && (
                    <button
                      onClick={() => setActiveTab("users")}
                      className="text-sm text-vocl-accent hover:underline"
                    >
                      See all {userCount}
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onFollowToggle={() => handleFollowToggle(user.id, user.isFollowing)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {tags.length > 0 && (activeTab === "all" || activeTab === "tags") && (
            <section>
              {activeTab === "all" && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Tags</h3>
                  {tagCount > 5 && (
                    <button
                      onClick={() => setActiveTab("tags")}
                      className="text-sm text-vocl-accent hover:underline"
                    >
                      See all {tagCount}
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag.name)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <IconHash size={14} className="text-vocl-accent" />
                    <span className="text-sm text-foreground">{tag.name}</span>
                    <span className="text-xs text-foreground/40">{tag.postCount}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Posts */}
          {posts.length > 0 && (activeTab === "all" || activeTab === "posts" || browsingTag) && (
            <section>
              {activeTab === "all" && !browsingTag && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Posts</h3>
                  {postCount > 5 && (
                    <button
                      onClick={() => setActiveTab("posts")}
                      className="text-sm text-vocl-accent hover:underline"
                    >
                      See all {postCount}
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {!hasResults && query && (
            <div className="text-center py-12">
              <IconSearch size={48} className="mx-auto text-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-foreground/50">
                Try searching for something else or browse trending tags
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// User Card Component
function UserCard({
  user,
  onFollowToggle,
}: {
  user: SearchResult["users"][0];
  onFollowToggle: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    await onFollowToggle();
    setIsLoading(false);
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
      <button
        onClick={handleFollow}
        disabled={isLoading}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
          user.isFollowing
            ? "bg-white/10 text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
            : "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
        }`}
      >
        {isLoading ? (
          <IconLoader2 size={16} className="animate-spin" />
        ) : user.isFollowing ? (
          "Following"
        ) : (
          "Follow"
        )}
      </button>
    </Link>
  );
}

// Post Card Component (simplified)
function PostCard({ post }: { post: SearchResult["posts"][0] }) {
  const contentType = post.postType as "text" | "image" | "video" | "audio" | "gallery";

  return (
    <div className="max-w-sm mx-auto">
      <InteractivePost
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
          reblogs: 0,
        }}
        initialInteractions={{
          hasCommented: false,
          hasLiked: false,
          hasReblogged: false,
        }}
        isSensitive={post.isSensitive}
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
    </div>
  );
}
