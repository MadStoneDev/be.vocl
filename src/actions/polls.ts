"use server";

import { createClient } from "@/lib/supabase/server";

interface VoteResult {
  success: boolean;
  error?: string;
}

interface PollResults {
  success: boolean;
  results?: {
    totalVotes: number;
    votes: number[];
    percentages: number[];
    userVote?: number; // The option index the current user voted for
    isExpired: boolean;
  };
  error?: string;
}

/**
 * Vote in a poll
 */
export async function voteInPoll(
  postId: string,
  optionIndex: number
): Promise<VoteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the post to verify it's a poll and check expiration
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("post_type, content, status")
      .eq("id", postId)
      .single();

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    if (post.post_type !== "poll") {
      return { success: false, error: "This post is not a poll" };
    }

    if (post.status !== "published") {
      return { success: false, error: "This poll is not available" };
    }

    const content = post.content;

    // Check if poll has expired
    if (content.expires_at && new Date(content.expires_at) < new Date()) {
      return { success: false, error: "This poll has expired" };
    }

    // Validate option index
    if (optionIndex < 0 || optionIndex >= content.options.length) {
      return { success: false, error: "Invalid option" };
    }

    // Check if user already voted
    const { data: existingVote } = await (supabase as any)
      .from("poll_votes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      // Update existing vote
      const { error } = await (supabase as any)
        .from("poll_votes")
        .update({ option_index: optionIndex })
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Vote update error:", error);
        return { success: false, error: "Failed to update vote" };
      }
    } else {
      // Create new vote
      const { error } = await (supabase as any)
        .from("poll_votes")
        .insert({
          post_id: postId,
          user_id: user.id,
          option_index: optionIndex,
        });

      if (error) {
        console.error("Vote error:", error);
        return { success: false, error: "Failed to vote" };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Vote error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Remove vote from a poll
 */
export async function removeVote(postId: string): Promise<VoteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("poll_votes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Remove vote error:", error);
      return { success: false, error: "Failed to remove vote" };
    }

    return { success: true };
  } catch (error) {
    console.error("Remove vote error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get poll results
 */
export async function getPollResults(postId: string): Promise<PollResults> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get the post
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("post_type, content")
      .eq("id", postId)
      .single();

    if (!post || post.post_type !== "poll") {
      return { success: false, error: "Poll not found" };
    }

    const content = post.content;
    const optionCount = content.options.length;
    const isExpired = content.expires_at
      ? new Date(content.expires_at) < new Date()
      : false;

    // Get all votes for this poll
    const { data: votes } = await (supabase as any)
      .from("poll_votes")
      .select("option_index, user_id")
      .eq("post_id", postId);

    // Count votes per option
    const voteCounts = new Array(optionCount).fill(0);
    let userVote: number | undefined;

    for (const vote of votes || []) {
      if (vote.option_index < optionCount) {
        voteCounts[vote.option_index]++;
      }
      if (user && vote.user_id === user.id) {
        userVote = vote.option_index;
      }
    }

    const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

    // Calculate percentages
    const percentages = voteCounts.map((count) =>
      totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    );

    return {
      success: true,
      results: {
        totalVotes,
        votes: voteCounts,
        percentages,
        userVote,
        isExpired,
      },
    };
  } catch (error) {
    console.error("Get poll results error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if user has voted in a poll
 */
export async function hasVotedInPoll(
  postId: string
): Promise<{ success: boolean; hasVoted: boolean; optionIndex?: number }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, hasVoted: false };
    }

    const { data: vote } = await (supabase as any)
      .from("poll_votes")
      .select("option_index")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    return {
      success: true,
      hasVoted: !!vote,
      optionIndex: vote?.option_index,
    };
  } catch (error) {
    console.error("Check vote error:", error);
    return { success: false, hasVoted: false };
  }
}
