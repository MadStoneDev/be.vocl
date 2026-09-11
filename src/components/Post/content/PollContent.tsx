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

      {/* Options — broadsheet: a label/percentage row over a thin 3px rule-bar
          (accent for the leading option, meta-dim otherwise). Before voting,
          a square radio indicator makes each row selectable. */}
      <div className="space-y-3.5">
        {(Array.isArray(content.options) ? content.options : []).map((option, index) => {
          const isSelected = selectedOption === index;
          const percentage = results?.percentages[index] || 0;
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
              className={`group w-full text-left transition-colors ${
                hasVoted || isExpired ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="flex items-center gap-2 min-w-0">
                  {!showResults && (
                    <span
                      className={`w-3.5 h-3.5 flex-none border flex items-center justify-center ${
                        isSelected ? "border-accent bg-accent" : "border-rule group-hover:border-meta"
                      }`}
                    >
                      {isSelected && <IconCheck size={10} className="text-white" />}
                    </span>
                  )}
                  <span
                    className={`font-sans text-[11px] tracking-[0.1em] uppercase truncate ${
                      isWinner ? "text-ink" : "text-editorial-body"
                    }`}
                  >
                    {option}
                  </span>
                </span>
                {showResults && (
                  <span
                    className={`font-sans text-[11px] tracking-[0.1em] tabular-nums ${
                      isWinner ? "text-accent" : "text-meta"
                    }`}
                  >
                    {percentage}%
                  </span>
                )}
              </div>
              {showResults && (
                <div className="h-[3px] w-full bg-rule">
                  <div
                    className={`h-[3px] transition-all duration-500 ${isWinner ? "bg-accent" : "bg-meta-dim"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Vote button / Results */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {!hasVoted && !isExpired ? (
          <button
            onClick={handleVote}
            disabled={selectedOption === null || isLoading}
            className="bg-accent text-white px-5 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-[0.88] transition-opacity"
          >
            {isLoading ? "Voting…" : "Vote"}
          </button>
        ) : (
          <span />
        )}

        <div className="byline text-meta flex items-center gap-2">
          {results && <span>{results.totalVotes} voted</span>}
          {content.expires_at && (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <IconClock size={13} />
                {getExpirationText()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
