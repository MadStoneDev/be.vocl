# be.vocl — Performance Audit (2026-07-30)

Method: three parallel code audits — data-fetching/N+1, client bundle/realtime, images/rendering. Findings ranked by impact. Nothing here is fixed yet; this is the punch-list.

## Top priorities (do these first)

1. **Feed re-renders entirely on every scroll-append.** `InteractivePost` is `memo()`'d but the feed passes post content as `children` (a fresh JSX element every render), so the shallow compare never hits — every mounted post (each with `useLike`/`useComments`/`useReblog`/`useBookmark`) re-renders on any `FeedList` state change. `src/components/feed/FeedList.tsx:137` + `src/components/Post/InteractivePost.tsx:757`. Fix: render content from data props inside `InteractivePost` instead of `children`, or drop the ineffective memo.

2. **App-wide chat subscription refetches the whole conversation list on every message.** `src/hooks/useChat.ts:136-155` subscribes to ALL `messages` INSERTs (no filter) and calls `refreshConversations()` (full round-trip) + toggles `isLoading` (skeleton flash). Mounted for every authenticated page via `AppChrome`. Fix: filter/debounce, patch only the affected conversation, don't toggle loading on realtime.

3. **Conversation list + unread count fetch unbounded message history.** `src/actions/messages.ts:148-160` pulls *every* non-deleted message across all conversations (no `.limit()`) to pick the latest per thread and to count unread in JS. Grows with total data. Fix: latest-row-per-conversation (lateral limit-1 / `distinct on`) and a DB `count` for unread.

4. **Search re-counts likes/comments by pulling every row — ignoring the denormalized counters it already selected.** `src/actions/search.ts:500-514` (`formatPosts`) discards `like_count`/`comment_count` and issues `likes`/`comments` row fetches, counting in JS. Fix: use the selected counters; delete the two count queries.

5. **ProfileHeader avatar over-fetches a full-viewport image.** `src/components/profile/ProfileHeader.tsx:147` — 80–112px avatar with `<Image fill priority>` and **no `sizes`** → defaults to `100vw` (fetches ~1920px) AND competes with the real LCP. Fix: `sizes="(max-width: 640px) 80px, 112px"`.

## High-value, medium effort

6. **`framer-motion` ships the full bundle into the always-loaded chrome.** All consumers use `import { motion } from "framer-motion"` (no `LazyMotion`/`m`), and `CommandPalette` (which uses it) is statically imported + always mounted in `AppChrome` (`AppChrome.tsx:5,211`). Fix: `LazyMotion`+`domAnimation`+`m`, and/or `next/dynamic` the CommandPalette (only surfaces on ⌘K).

7. **Tag search materialises all post IDs for a tag, then `IN (...)`.** `src/actions/search.ts:283-291` (also `getPostsByTag`). Fix: join `post_tags` inline and paginate at the DB.

8. **`fill`-without-`sizes` avatar/art over-fetch across list rows.** `NotificationItem.tsx:203` (per notification), community about/settings member lists (`c/[slug]/about:182`, `settings:511,561`), `tips/page.tsx:136`, `u/[username]/archive:151`, album art `AudioContent.tsx:208` (per audio post), lightbox thumbs `ImageLightbox.tsx:137`. Fix: add `sizes` matching the rendered box.

9. **`getFullProfile` has a 4th sequential round-trip that over-fetches all comment rows.** `src/actions/profile.ts:1105-1119`. Fix: fold into stage-2 `Promise.all`; derive commented-post count via DB count.

10. **TipTap shipped eagerly on the Asks route.** `src/app/(main)/asks/page.tsx:13` statically imports `RichTextEditor`. Fix: `next/dynamic`.

## Lower priority / notes

11. `getCommentedPosts` (posts.ts:913) over-fetches full post `content` just to dedupe — select only ids/status first.
12. `getNotifications` (notifications.ts:64,101) — list + unread count are sequential; `Promise.all` them.
13. Explore rising-creators (explore.ts:176) counts posts by scanning all author rows.
14. Search `sortBy:"popular"` (search.ts:337) paginates before sorting → effectively broken + needs over-fetch; order by denormalized engagement columns instead.
15. Chat `MessageBubble` (`chat/MessageBubble.tsx:139`) not memoized + inline `onReply`/`replyTo` literal → whole message list re-renders on every message/typing toggle. `NotificationItem` also unmemoized.
16. `FloatingPostsBackground.tsx:517` runs a 20fps `setState` loop — but appears to be **dead code** (not imported anywhere); verify then delete.
17. Non-full-bleed article hero forces `sizes="100vw"` (`Post.tsx:1488`) — use the reading-column width.

### Confirmed NOT problems
- Main feed queries (`getFeedPosts`, `getTrendingFeed`, `batchFetchPostStats`, `getPublicFrontPagePosts`) are well-batched with denormalized counters + proper `.range()`.
- `unoptimized` usages are all legit (GIFs, external OG/link images).
- Feed `priority={index<3}` is correct.
- Realtime channels in useChat (conversation-scoped), useTypingPresence, useOnlineStatus are cleaned up — no leaks. Timers all cleared on unmount.
- Composer/editor is route-split + lazy-loaded (good); `/create` is prefetched.
