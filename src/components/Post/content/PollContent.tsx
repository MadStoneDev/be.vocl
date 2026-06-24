"use client";

import { useState, useEffect } from "react";
import { IconCheck, IconClock } from "@tabler/icons-react";
import { voteInPoll, getPollResults } from "@/actions/polls";
import type { PollPostContent } from "@/types/database";

interface PollContentProps {
  postId: string;
  content: PollPostContent;
  /** Broadsheet article mode: boxless + theme-aware colors (no gray card). */
  article?: boolean;
}

export function PollContent({ postId, content, article }: PollContentProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    totalVotes: number;
    votes: number[];
    percentages: number[];
    userVote?: number;
    isExpired: boolean;
  } | null>(null);

  const isExpired = content.expires_at
    ? new Date(content.expires_at) < new Date()
    : false;

  // Load poll results on mount
  useEffect(() => {
    loadResults();
  }, [postId]);

  const loadResults = async () => {
    const response = await getPollResults(postId);
    if (response.success && response.results) {
      setResults(response.results);
      if (response.results.userVote !== undefined) {
        setHasVoted(true);
        setSelectedOption(response.results.userVote);
      }
    }
  };

  const handleVote = async () => {
    if (selectedOption === null || isLoading || isExpired) return;

    setIsLoading(true);
    const response = await voteInPoll(postId, selectedOption);

    if (response.success) {
      setHasVoted(true);
      await loadResults();
    }

    setIsLoading(false);
  };

  const showResults =
    hasVoted || isExpired || content.show_results_before_vote;

  // Format expiration time
  const getExpirationText = () => {
    if (!content.expires_at) return null;
    const expiresAt = new Date(content.expires_at);
    if (isExpired) {
      return "Poll ended";
    }
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} left`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? "s" : ""} left`;
  };

  // Theme-aware tokens for the article (boxless) variant vs the feed card (light).
  const t = article
    ? {
        wrap: "py-2",
        question: "type-heading text-foreground mb-4",
        optionBg: "bg-vocl-hover",
        optionHover: "hover:bg-vocl-hover-strong",
        barOther: "bg-vocl-hover-strong",
        indicator: "border-vocl-border",
        optionText: "text-foreground/80",
        optionTextWinner: "text-foreground",
        meta: "text-foreground/50",
        metaStrong: "text-foreground/70",
      }
    : {
        wrap: "p-4",
        question: "font-semibold text-foreground/90 mb-4",
        optionBg: "bg-transparent",
        optionHover: "hover:bg-vocl-hover",
        barOther: "bg-vocl-hover",
        indicator: "border-vocl-border",
        optionText: "text-foreground/75",
        optionTextWinner: "text-foreground",
        meta: "text-foreground/55",
        metaStrong: "text-foreground/65",
      };

  return (
    <div className={t.wrap}>
      {/* Question */}
      <h3 className={t.question}>{content.question}</h3>

      {/* Options */}
      <div className="space-y-2">
        {content.options.map((option, index) => {
          const isSelected = selectedOption === index;
          const percentage = results?.percentages[index] || 0;
          const voteCount = results?.votes[index] || 0;
          const isWinner =
            showResults &&
            results &&
            results.votes[index] === Math.max(...results.votes) &&
            results.votes[index] > 0;

          return (
            <button
              key={index}
              onClick={() => !hasVoted && !isExpired && setSelectedOption(index)}
              disabled={hasVoted || isExpired || isLoading}
              className={`relative w-full text-left p-3 rounded-sm transition-all overflow-hidden ${
                hasVoted || isExpired
                  ? "cursor-default"
                  : `cursor-pointer ${t.optionHover}`
              } ${
                isSelected && !hasVoted
                  ? "ring-2 ring-vocl-primary bg-vocl-primary/10"
                  : t.optionBg
              }`}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isWinner ? "bg-vocl-primary/20" : t.barOther
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Content */}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Checkbox/Radio indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-vocl-primary bg-vocl-primary"
                        : t.indicator
                    }`}
                  >
                    {isSelected && (
                      <IconCheck size={12} className="text-white" />
                    )}
                  </div>

                  <span
                    className={`font-medium ${
                      isWinner ? t.optionTextWinner : t.optionText
                    }`}
                  >
                    {option}
                  </span>
                </div>

                {showResults && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={t.meta}>{voteCount}</span>
                    <span
                      className={`font-semibold ${
                        isWinner ? "text-vocl-primary" : t.metaStrong
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote button / Results */}
      <div className="mt-4 flex items-center justify-between">
        {!hasVoted && !isExpired ? (
          <button
            onClick={handleVote}
            disabled={selectedOption === null || isLoading}
            className="px-4 py-2 bg-vocl-primary text-white rounded-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-vocl-primary/90 transition-colors"
          >
            {isLoading ? "Voting..." : "Vote"}
          </button>
        ) : (
          <span />
        )}

        <div className={`flex items-center gap-2 text-sm ${t.meta}`}>
          {results && (
            <span>
              {results.totalVotes} vote{results.totalVotes !== 1 ? "s" : ""}
            </span>
          )}
          {content.expires_at && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <IconClock size={14} />
                {getExpirationText()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
