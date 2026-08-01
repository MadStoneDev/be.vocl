import { FeedSkeleton } from "@/components/ui";

// Mirrors FeedClient's container (max-w-5xl) and its sticky tabs row so the
// skeleton occupies the same footprint the real feed will — the content swaps
// in place instead of visibly re-laying-out ("settling") after the fetch.
export default function FeedLoading() {
  return (
    <div className="py-1 sm:py-3 mx-auto max-w-5xl">
      {/* Sort tabs + layout toggle placeholder */}
      <div className="flex items-center justify-between px-3 sm:px-0 py-3 mb-2">
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />
        </div>
        <div className="hidden lg:block h-8 w-16 rounded-full bg-white/5 animate-pulse" />
      </div>
      <FeedSkeleton count={5} />
    </div>
  );
}
