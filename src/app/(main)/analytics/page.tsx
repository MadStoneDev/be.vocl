"use client";

import { useEffect, useState, useCallback } from "react";
import {
  IconChartBar,
  IconHeart,
  IconMessage,
  IconRepeat,
  IconHash,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconLayoutGrid,
  IconFileText,
  IconUsers,
  IconTrendingUp,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import Link from "next/link";
import {
  getPostAnalytics,
  getFollowerCount,
  getPostDetailAnalytics,
} from "@/actions/analytics";
import { LoadingSpinner } from "@/components/ui";

type TimeRange = "7d" | "30d" | "90d";

interface TopPost {
  id: string;
  post_type: string;
  content: any;
  created_at: string;
  like_count: number;
  comment_count: number;
  reblog_count: number;
  tags: string[] | null;
  engagement: number;
}

interface EngagementDay {
  date: string;
  likes: number;
  comments: number;
  reblogs: number;
}

interface TagAnalytics {
  tag: string;
  postCount: number;
  avgLikes: number;
  avgComments: number;
  avgReblogs: number;
  avgEngagement: number;
}

interface PostTypeCount {
  postType: string;
  count: number;
  percentage: number;
}

interface PostDetailData {
  post: { id: string; postType: string; content: any; createdAt: string };
  totalLikes: number;
  totalComments: number;
  totalReblogs: number;
  engagementOverTime: Array<{
    date: string;
    likes: number;
    comments: number;
    reblogs: number;
  }>;
  topCommenters: Array<{ username: string; commentCount: number }>;
}

const postTypeColors: Record<string, string> = {
  text: "bg-vocl-accent",
  image: "bg-green-500",
  video: "bg-blue-500",
  audio: "bg-purple-500",
  gallery: "bg-amber-500",
};

const postTypeIcons: Record<string, React.ReactNode> = {
  text: <IconFileText className="w-4 h-4" />,
  image: <IconPhoto className="w-4 h-4" />,
  video: <IconVideo className="w-4 h-4" />,
  audio: <IconMusic className="w-4 h-4" />,
  gallery: <IconLayoutGrid className="w-4 h-4" />,
};

function getPostPreview(post: TopPost): string {
  if (!post.content) return "No content";
  if (typeof post.content === "string") return post.content.slice(0, 100);
  if (post.content.text) return post.content.text.slice(0, 100);
  if (post.content.caption) return post.content.caption.slice(0, 100);
  if (post.content.title) return post.content.title.slice(0, 100);
  return `${post.post_type} post`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [engagementOverTime, setEngagementOverTime] = useState<EngagementDay[]>(
    []
  );
  const [topTags, setTopTags] = useState<TagAnalytics[]>([]);
  const [postTypeBreakdown, setPostTypeBreakdown] = useState<PostTypeCount[]>(
    []
  );
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<PostDetailData | null>(null);
  const [postDetailLoading, setPostDetailLoading] = useState(false);

  const togglePostDetail = useCallback(
    async (postId: string) => {
      if (expandedPostId === postId) {
        setExpandedPostId(null);
        setPostDetail(null);
        return;
      }
      setExpandedPostId(postId);
      setPostDetail(null);
      setPostDetailLoading(true);
      const result = await getPostDetailAnalytics(postId);
      if (result.success && result.data) {
        setPostDetail(result.data);
      }
      setPostDetailLoading(false);
    },
    [expandedPostId]
  );

  const fetchData = useCallback(async (range: TimeRange) => {
    setLoading(true);
    const [analyticsResult, followerResult] = await Promise.all([
      getPostAnalytics(range),
      getFollowerCount(),
    ]);

    if (analyticsResult.success) {
      setTopPosts(analyticsResult.topPosts || []);
      setEngagementOverTime(analyticsResult.engagementOverTime || []);
      setTopTags(analyticsResult.topTags || []);
      setPostTypeBreakdown(analyticsResult.postTypeBreakdown || []);
    }

    if (followerResult.success) {
      setFollowerCount(followerResult.followerCount || 0);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(timeRange);
  }, [timeRange, fetchData]);

  const totalEngagement = engagementOverTime.reduce(
    (acc, d) => acc + d.likes + d.comments + d.reblogs,
    0
  );
  const totalLikes = engagementOverTime.reduce((acc, d) => acc + d.likes, 0);
  const totalComments = engagementOverTime.reduce(
    (acc, d) => acc + d.comments,
    0
  );
  const totalReblogs = engagementOverTime.reduce(
    (acc, d) => acc + d.reblogs,
    0
  );

  return (
    <div className="py-6">
      <title>Analytics | be.vocl</title>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vocl-accent/20 flex items-center justify-center">
            <IconChartBar className="w-5 h-5 text-vocl-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-vocl-surface-dark rounded-xl p-1 border border-white/5">
          {(["7d", "30d", "90d"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-vocl-accent text-white"
                  : "text-foreground/50 hover:text-foreground hover:bg-white/5"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5">
              <div className="flex items-center gap-2 text-foreground/50 mb-1">
                <IconTrendingUp className="w-4 h-4" />
                <span className="text-xs">Total Engagement</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {totalEngagement.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5">
              <div className="flex items-center gap-2 text-foreground/50 mb-1">
                <IconHeart className="w-4 h-4" />
                <span className="text-xs">Likes</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {totalLikes.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5">
              <div className="flex items-center gap-2 text-foreground/50 mb-1">
                <IconMessage className="w-4 h-4" />
                <span className="text-xs">Comments</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {totalComments.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5">
              <div className="flex items-center gap-2 text-foreground/50 mb-1">
                <IconUsers className="w-4 h-4" />
                <span className="text-xs">Followers</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {followerCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Post Type Breakdown */}
          <div className="rounded-xl bg-vocl-surface-dark border border-white/5 p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Post Type Breakdown
            </h2>
            {postTypeBreakdown.length === 0 ? (
              <p className="text-foreground/50 text-sm">
                No posts in this time range.
              </p>
            ) : (
              <div className="space-y-3">
                {postTypeBreakdown.map((item) => (
                  <div key={item.postType}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/70">
                          {postTypeIcons[item.postType] || (
                            <IconFileText className="w-4 h-4" />
                          )}
                        </span>
                        <span className="text-sm font-medium text-foreground capitalize">
                          {item.postType}
                        </span>
                      </div>
                      <span className="text-sm text-foreground/50">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          postTypeColors[item.postType] || "bg-vocl-accent"
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Posts */}
          <div className="rounded-xl bg-vocl-surface-dark border border-white/5 p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Top Posts
            </h2>
            {topPosts.length === 0 ? (
              <p className="text-foreground/50 text-sm">
                No posts in this time range.
              </p>
            ) : (
              <div className="space-y-2">
                {topPosts.map((post, index) => {
                  const isExpanded = expandedPostId === post.id;
                  return (
                    <div key={post.id}>
                      <button
                        onClick={() => togglePostDetail(post.id)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                      >
                        <span className="text-sm font-bold text-foreground/30 w-6 text-right mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-foreground/50">
                              {postTypeIcons[post.post_type] || (
                                <IconFileText className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <span className="text-xs text-foreground/40">
                              {formatDate(post.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground truncate">
                            {getPostPreview(post)}
                          </p>
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-foreground/50">
                              <IconHeart className="w-3.5 h-3.5" />
                              {post.like_count}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-foreground/50">
                              <IconMessage className="w-3.5 h-3.5" />
                              {post.comment_count}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-foreground/50">
                              <IconRepeat className="w-3.5 h-3.5" />
                              {post.reblog_count}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex items-start gap-2">
                          <div>
                            <span className="text-sm font-semibold text-vocl-accent">
                              {post.engagement}
                            </span>
                            <p className="text-xs text-foreground/40">
                              engagement
                            </p>
                          </div>
                          {isExpanded ? (
                            <IconChevronUp className="w-4 h-4 text-foreground/40 mt-0.5" />
                          ) : (
                            <IconChevronDown className="w-4 h-4 text-foreground/40 mt-0.5" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="mx-3 mb-2 p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                          {postDetailLoading ? (
                            <div className="flex justify-center py-4">
                              <LoadingSpinner size="sm" />
                            </div>
                          ) : postDetail ? (
                            <>
                              {/* Engagement Breakdown */}
                              <div>
                                <h3 className="text-sm font-semibold text-foreground mb-2">
                                  Engagement Breakdown
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="p-3 rounded-lg bg-vocl-surface-dark border border-white/5 text-center">
                                    <IconHeart className="w-4 h-4 text-red-400 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-foreground">
                                      {postDetail.totalLikes}
                                    </p>
                                    <p className="text-xs text-foreground/40">
                                      Likes
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-vocl-surface-dark border border-white/5 text-center">
                                    <IconMessage className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-foreground">
                                      {postDetail.totalComments}
                                    </p>
                                    <p className="text-xs text-foreground/40">
                                      Comments
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-vocl-surface-dark border border-white/5 text-center">
                                    <IconRepeat className="w-4 h-4 text-green-400 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-foreground">
                                      {postDetail.totalReblogs}
                                    </p>
                                    <p className="text-xs text-foreground/40">
                                      Echoes
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Day-by-Day Engagement */}
                              {postDetail.engagementOverTime.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-foreground mb-2">
                                    Day-by-Day Engagement
                                  </h3>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-white/5">
                                          <th className="text-left py-2 pr-4 text-foreground/50 font-medium">
                                            Date
                                          </th>
                                          <th className="text-right py-2 px-4 text-foreground/50 font-medium">
                                            Likes
                                          </th>
                                          <th className="text-right py-2 px-4 text-foreground/50 font-medium">
                                            Comments
                                          </th>
                                          <th className="text-right py-2 px-4 text-foreground/50 font-medium">
                                            Echoes
                                          </th>
                                          <th className="text-right py-2 pl-4 text-foreground/50 font-medium">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {postDetail.engagementOverTime.map(
                                          (day) => {
                                            const total =
                                              day.likes +
                                              day.comments +
                                              day.reblogs;
                                            return (
                                              <tr
                                                key={day.date}
                                                className="border-b border-white/5 last:border-0"
                                              >
                                                <td className="py-2 pr-4 text-foreground/70">
                                                  {formatDate(day.date)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-foreground">
                                                  {day.likes}
                                                </td>
                                                <td className="py-2 px-4 text-right text-foreground">
                                                  {day.comments}
                                                </td>
                                                <td className="py-2 px-4 text-right text-foreground">
                                                  {day.reblogs}
                                                </td>
                                                <td className="py-2 pl-4 text-right font-medium text-vocl-accent">
                                                  {total}
                                                </td>
                                              </tr>
                                            );
                                          }
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Top Commenters */}
                              {postDetail.topCommenters.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-foreground mb-2">
                                    Top Commenters
                                  </h3>
                                  <div className="space-y-1.5">
                                    {postDetail.topCommenters.map(
                                      (commenter) => (
                                        <div
                                          key={commenter.username}
                                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-vocl-surface-dark border border-white/5"
                                        >
                                          <Link
                                            href={`/u/${commenter.username}`}
                                            className="text-sm text-foreground hover:text-vocl-accent transition-colors"
                                          >
                                            @{commenter.username}
                                          </Link>
                                          <span className="text-xs text-foreground/50">
                                            {commenter.commentCount} comment
                                            {commenter.commentCount !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Link to full post */}
                              <div className="pt-1">
                                <Link
                                  href={`/post/${post.id}`}
                                  className="text-xs text-vocl-accent hover:underline"
                                >
                                  View full post
                                </Link>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-foreground/50">
                              Failed to load post details.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Tags */}
          <div className="rounded-xl bg-vocl-surface-dark border border-white/5 p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Top Tags
            </h2>
            {topTags.length === 0 ? (
              <p className="text-foreground/50 text-sm">
                No tagged posts in this time range.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topTags.map((tag) => (
                  <div
                    key={tag.tag}
                    className="p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconHash className="w-4 h-4 text-vocl-accent" />
                      <span className="font-medium text-foreground">
                        {tag.tag}
                      </span>
                      <span className="text-xs text-foreground/40 ml-auto">
                        {tag.postCount} post{tag.postCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-xs text-foreground/50">
                        <IconHeart className="w-3.5 h-3.5" />
                        {tag.avgLikes} avg
                      </span>
                      <span className="flex items-center gap-1 text-xs text-foreground/50">
                        <IconMessage className="w-3.5 h-3.5" />
                        {tag.avgComments} avg
                      </span>
                      <span className="flex items-center gap-1 text-xs text-foreground/50">
                        <IconRepeat className="w-3.5 h-3.5" />
                        {tag.avgReblogs} avg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Engagement Over Time */}
          <div className="rounded-xl bg-vocl-surface-dark border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconCalendar className="w-5 h-5 text-foreground/50" />
              <h2 className="text-lg font-semibold text-foreground">
                Engagement Over Time
              </h2>
            </div>
            {engagementOverTime.length === 0 ? (
              <p className="text-foreground/50 text-sm">
                No data in this time range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2 pr-4 text-foreground/50 font-medium">
                        Date
                      </th>
                      <th className="text-right py-2 px-4 text-foreground/50 font-medium">
                        Likes
                      </th>
                      <th className="text-right py-2 px-4 text-foreground/50 font-medium">
                        Comments
                      </th>
                      <th className="text-right py-2 px-4 text-foreground/50 font-medium">
                        Reblogs
                      </th>
                      <th className="text-right py-2 pl-4 text-foreground/50 font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagementOverTime.map((day) => {
                      const total = day.likes + day.comments + day.reblogs;
                      return (
                        <tr
                          key={day.date}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="py-2 pr-4 text-foreground/70">
                            {formatDate(day.date)}
                          </td>
                          <td className="py-2 px-4 text-right text-foreground">
                            {day.likes}
                          </td>
                          <td className="py-2 px-4 text-right text-foreground">
                            {day.comments}
                          </td>
                          <td className="py-2 px-4 text-right text-foreground">
                            {day.reblogs}
                          </td>
                          <td className="py-2 pl-4 text-right font-medium text-vocl-accent">
                            {total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
