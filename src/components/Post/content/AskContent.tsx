"use client";

import Link from "next/link";
import Image from "next/image";
import { IconUserQuestion } from "@tabler/icons-react";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import { VoiceClipPlayer } from "./VoiceClipPlayer";
import type { AskPostContent } from "@/types/database";

interface AskContentProps {
  content: AskPostContent;
}

export function AskContent({ content }: AskContentProps) {
  return (
    <div className="bg-[#EBEBEB]">
      {/* Question section */}
      <div className="p-4 bg-neutral-100 border-b border-neutral-200">
        <div className="flex items-start gap-3">
          {/* Asker avatar or anonymous icon */}
          {content.is_anonymous ? (
            <div className="w-10 h-10 rounded-full bg-neutral-300 flex items-center justify-center flex-shrink-0">
              <IconUserQuestion size={20} className="text-neutral-500" />
            </div>
          ) : content.asker_id ? (
            <Link
              href={`/profile/${content.asker_username}`}
              className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity"
            >
              <Image
                src={`/api/avatar/${content.asker_id}`}
                alt={content.asker_username || "User"}
                fill
                className="object-cover"
              />
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-300 flex items-center justify-center flex-shrink-0">
              <IconUserQuestion size={20} className="text-neutral-500" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Asker name */}
            <div className="flex items-center gap-1 mb-1">
              {content.is_anonymous ? (
                <span className="text-sm font-medium text-neutral-500">
                  Anonymous asked:
                </span>
              ) : content.asker_username ? (
                <Link
                  href={`/profile/${content.asker_username}`}
                  className="text-sm font-medium text-neutral-700 hover:text-vocl-accent transition-colors"
                >
                  {content.asker_username} asked:
                </Link>
              ) : (
                <span className="text-sm font-medium text-neutral-500">
                  Someone asked:
                </span>
              )}
            </div>

            {/* Question (text — only render when there is text) */}
            {content.question_html ? (
              <div
                className="text-neutral-800 prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_p:empty]:before:content-['\00a0']"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtmlWithSafeLinks(content.question_html),
                }}
              />
            ) : content.question ? (
              <p className="text-neutral-800">{content.question}</p>
            ) : null}

            {/* Question voice clip */}
            {content.question_audio_url && (
              <div className="mt-2">
                <VoiceClipPlayer
                  src={content.question_audio_url}
                  duration={content.question_audio_duration}
                  variant="light"
                  label="Voice"
                />
                {content.question_audio_transcript && (
                  <p className="mt-1.5 text-sm text-neutral-500 italic whitespace-pre-wrap leading-relaxed">
                    &ldquo;{content.question_audio_transcript}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Answer section */}
      <div className="p-4 space-y-3">
        {/* Answer text — only render when present */}
        {content.answer_html && content.answer_html.trim() && (
          <div
            className="font-sans text-base leading-relaxed text-neutral-800 prose prose-sm max-w-none prose-p:my-2 prose-p:first:mt-0 prose-p:last:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_p:empty]:before:content-['\00a0']"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtmlWithSafeLinks(content.answer_html),
            }}
          />
        )}

        {/* Answer voice clip */}
        {content.answer_audio_url && (
          <div>
            <VoiceClipPlayer
              src={content.answer_audio_url}
              duration={content.answer_audio_duration}
              variant="light"
              label="Voice answer"
            />
            {content.answer_audio_transcript && (
              <p className="mt-1.5 text-sm text-neutral-500 italic whitespace-pre-wrap leading-relaxed">
                &ldquo;{content.answer_audio_transcript}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
