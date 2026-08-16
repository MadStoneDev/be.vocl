import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import type { FeedPost } from "../FeedList";
import { FrontPageTile } from "./FrontPageTiles";

/**
 * A single tag "shelf" for the public Discover page: a header (#tag + count +
 * see-more) above a horizontally-scrolling row of real sample post cards.
 * Server component — renders the client FrontPageTile inline.
 */
export function TagShelf({
  name,
  postCount,
  posts,
}: {
  name: string;
  postCount: number;
  posts: FeedPost[];
}) {
  if (posts.length === 0) return null;
  const href = `/discover/tag/${encodeURIComponent(name)}`;

  return (
    <section className="border-t border-vocl-border py-8 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={href}
            className="type-display text-xl font-bold text-foreground transition-colors hover:text-vocl-primary"
          >
            <span className="text-vocl-primary">#</span>
            {name}
          </Link>
          <p className="type-meta text-foreground/45">
            {postCount.toLocaleString()} {postCount === 1 ? "post" : "posts"}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 type-meta font-semibold text-vocl-primary transition-opacity hover:opacity-80"
        >
          See more
          <IconArrowRight size={15} />
        </Link>
      </div>

      {/* Horizontal scroller. Each card is a fixed-width snap target. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {posts.map((post) => (
          <div
            key={post.id}
            className="w-[16rem] shrink-0 snap-start rounded-2xl border border-vocl-border p-4 sm:w-[18rem]"
          >
            <FrontPageTile post={post} prominence="standard" />
          </div>
        ))}
      </div>
    </section>
  );
}
