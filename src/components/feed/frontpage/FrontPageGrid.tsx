"use client";

import { IconLoader2 } from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import { FeedSkeleton } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type { FeedPost } from "../FeedList";
import { useFeedLayout } from "./useFeedLayout";
import { FrontPageTile } from "./FrontPageTiles";
import { TileEngagement } from "./TileEngagement";

interface FrontPageGridProps {
  posts: FeedPost[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
}

/**
 * NYT-style broadsheet rendering of the feed: a curated hero (lead + 2 features)
 * over a recency-ordered river of standards, separated by hairline rules.
 * Consumes the exact same post array as FeedList — no extra fetch.
 */
export function FrontPageGrid({
  posts,
  isLoading = false,
  isLoadingMore = false,
}: FrontPageGridProps) {
  const { lead, features, standards } = useFeedLayout(posts);

  if (isLoading && posts.length === 0) {
    return <FeedSkeleton count={3} />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground/40 text-lg mb-2">Your feed is empty</p>
        <p className="text-foreground/30 text-sm">
          Follow some people or tags to see posts here!
        </p>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    {/* Break out of the centered reading column to fill the content area on wide screens. */}
    <div className="mx-auto w-full xl:-mx-32 xl:w-[calc(100%+16rem)] 2xl:-mx-56 2xl:w-[calc(100%+28rem)]">
      {/* Hero tier */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-8">
        {lead && (
          <motion.div className="lg:col-span-8" initial="hidden" animate="show" variants={fadeUp}>
            <FrontPageTile post={lead} prominence="lead" />
            <TileEngagement post={lead} />
          </motion.div>
        )}
        {features.length > 0 && (
          <motion.div
            className="lg:col-span-4 flex flex-col lg:border-l lg:border-vocl-border lg:pl-8 divide-y divide-vocl-border"
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.08)}
          >
            {features.map((p) => (
              <motion.div key={p.id} className="py-6 first:pt-0 last:pb-0" variants={fadeUp}>
                <FrontPageTile post={p} prominence="feature" />
                <TileEngagement post={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Section rule + kicker */}
      {standards.length > 0 && (
        <>
          <div className="mt-10 mb-6 flex items-center gap-3">
            <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
              More stories
            </span>
            <span className="h-px flex-1 bg-vocl-border" />
          </div>

          {/* Standards river */}
          <motion.section
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10"
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.04)}
          >
            {standards.map((p) => (
              <motion.div key={p.id} className="cv-tile border-t border-vocl-border pt-5" variants={fadeUp}>
                <FrontPageTile post={p} prominence="standard" />
                <TileEngagement post={p} />
              </motion.div>
            ))}
          </motion.section>
        </>
      )}

      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <IconLoader2
            size={32}
            className="animate-spin text-vocl-primary"
            aria-label="Loading more posts"
          />
        </div>
      )}
    </div>
    </MotionConfig>
  );
}
