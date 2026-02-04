"use client";

import { useState, useEffect } from "react";
import { IconCheck, IconClock } from "@tabler/icons-react";
import { voteInPoll, getPollResults } from "@/actions/polls";
import type { PollPostContent } from "@/types/database";

interface PollContentProps {
  postId: string;
  content: PollPostContent;
}

export function PollContent({ postId, content }: PollContentProps) {
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

  return (
    <div className="p-4 bg-[#EBEBEB]">
      {/* Question */}
      <h3 className="font-semibold text-neutral-800 mb-4">{content.question}</h3>

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
              className={`relative w-full text-left p-3 rounded-xl transition-all overflow-hidden ${
                hasVoted || isExpired
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-neutral-200"
              } ${
                isSelected && !hasVoted
                  ? "ring-2 ring-vocl-accent bg-vocl-accent/10"
                  : "bg-white"
              }`}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isWinner ? "bg-vocl-accent/20" : "bg-neutral-200"
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
                        ? "border-vocl-accent bg-vocl-accent"
                        : "border-neutral-300"
                    }`}
                  >
                    {isSelected && (
                      <IconCheck size={12} className="text-white" />
                    )}
                  </div>

                  <span
                    className={`font-medium ${
                      isWinner ? "text-neutral-900" : "text-neutral-700"
                    }`}
                  >
                    {option}
                  </span>
                </div>

                {showResults && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">{voteCount}</span>
                    <span
                      className={`font-semibold ${
                        isWinner ? "text-vocl-accent" : "text-neutral-600"
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
        <div className="flex items-center gap-2 text-sm text-neutral-500">
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

        {!hasVoted && !isExpired && (
          <button
            onClick={handleVote}
            disabled={selectedOption === null || isLoading}
            className="px-4 py-2 bg-vocl-accent text-white rounded-full font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-vocl-accent/90 transition-colors"
          >
            {isLoading ? "Voting..." : "Vote"}
          </button>
        )}
      </div>
    </div>
  );
}
