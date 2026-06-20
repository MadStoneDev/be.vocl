# Be.Vocl — Audit Remediation & Feed Redesign Plan

_Generated 2026-06-19. Source: parallel security / correctness / performance audits + Tumblr & 2026 UI-trend research._

Effort key: **S** ≈ <½ day · **M** ≈ ½–1 day · **L** ≈ 2–4 days
Tracks are independent and can run in parallel by different people. **Phase 0 is a launch blocker.**

---

## Phase 0 — Critical security (launch blockers)

> **✅ Done in code (2026-06-20).** SEC-1 privilege-escalation `BEFORE UPDATE` trigger + SEC-5 RLS-on-PII + SEC-9/10 in `supabase/migrations/20260620_security_hardening.sql`; SEC-2/3 actions deleted (+ call sites); SEC-4 transcribe auth+ownership. **⚠️ The migration must be applied to the DB to be live** (the app also now selects new columns — see "Migrations" note at the bottom).

> All directly exploitable with little/no privilege. Do #SEC-1 first — it is the keystone that re-validates every role-based moderation check.

| ID | Ticket | Fix | Files | Effort |
|----|--------|-----|-------|--------|
| SEC-1 | Privilege escalation via profile UPDATE | Add `WITH CHECK` + column restriction; `REVOKE UPDATE (role, is_verified, lock_status, banned_at, ban_reason, appeals_blocked, invite_codes_remaining…)` from `authenticated`; mutate those only via service role / `SECURITY DEFINER`. Add trigger rejecting privileged-column changes from non-service callers. | `supabase/migrations/00001_initial_schema.sql:353` (+ new migration) | M |
| SEC-2 | Free self-verification | Delete `completeVerification`; verification flips only from the signed Paddle webhook. | `actions/payments.ts:360` | S |
| SEC-3 | Forged tip completion | Delete `completeTip`; rely on Paddle webhook. | `actions/payments.ts:78` | S |
| SEC-4 | `transcribePostAudio` no-auth IDOR | Add `requireAuth()`, verify `post.author_id === user.id`, rate-limit. | `actions/transcribe.ts:14` | S |
| SEC-5 | RLS disabled on PII tables | `ENABLE ROW LEVEL SECURITY` on `email_sends`, `email_send_recipients`, `email_template_customizations`, `user_tags`, `user_tag_assignments`, `message_email_tracking`, `pending_digest_notifications`; SELECT owner/admin only, writes service-role only. | `00006_*`, `00007_*` (+ new migration) | M |

---

## Phase 1 — High security + user-visible correctness

> **✅ Security done in code (2026-06-20):** SEC-6 cron fail-closed, SEC-7 test-email deleted, SEC-8 SSRF guard (`api/_lib/ssrf.ts`), SEC-9/10 (in migration), SEC-11 mod authz (communities/reports/flags), SEC-12 email/mentions auth, SEC-13 `.or()` sanitization, SEC-14 presign size cap + `search_path`.
> **Correctness bugs:** ✅ BUG-1 (feed pagination `.range` off-by-one — `posts.ts:1030`), ✅ BUG-2 (WhoToFollow follow-state seeding). ⏳ BUG-3…8 still open (VoiceRecorder leaks, chat dedup/cancellation/edit-revert, alt-text alignment, hygiene).

### Security
| ID | Ticket | Fix | Files | Effort |
|----|--------|-----|-------|--------|
| SEC-6 | Cron routes fail open | Return 401 when `CRON_SECRET` unset; compare with `crypto.timingSafeEqual`. | `api/cron/{queue,digest,data-export,scheduled}/route.ts`, `api/queue/process/route.ts` | S |
| SEC-7 | Unauth test-email endpoint | Delete route (or gate admin + non-prod). | `api/test-email/route.ts` | S |
| SEC-8 | SSRF in image proxy | Centralize `isPrivateOrReservedHost`; `redirect:"manual"`, re-validate each hop's resolved IP. Apply to opengraph too. | `api/upload/from-url/route.ts`, `api/opengraph/route.ts` | M |
| SEC-9 | Forgeable notifications / audit_logs | `WITH CHECK (false)` for `authenticated` on both (service-role bypasses RLS); or constrain `actor_id = auth.uid()`. | `00001_…:489`, `20260204_audit_logs.sql:61` | S |
| SEC-10 | invite_codes world-readable | Drop blanket SELECT; validate via `use_invite_code()` SECURITY DEFINER; `invite_code_uses` INSERT `WITH CHECK (false)`. | `20260205_invite_codes.sql:74` | S |
| SEC-11 | Moderation actions trust client IDs | In-action role/assignment checks; require Admin for bans; gate owner-promotion to owners; add target-author role guard to `resolveFlag`. | `actions/communities.ts`, `actions/reports.ts:333`, `actions/flags.ts:262` | M |
| SEC-12 | Unauth email/mention senders | Make internal helpers or add `requireAuth()` + force `actor_id = user.id`. | `actions/email.ts:232`, `actions/mentions.ts:31` | S |
| SEC-13 | `.or()` filter injection in search | Strip PostgREST reserved chars (`,()*:.`) or use `textSearch`/RPC. | `actions/search.ts:122,384`, `actions/messages.ts:325,410` | S |
| SEC-14 | Presigned upload has no size limit | Presigned POST policy with `content-length-range`, or validate object size before referencing. Add `SET search_path` to all SECURITY DEFINER funcs. | `lib/r2/presign.ts:21`, migrations | M |

### Correctness
| ID | Ticket | Fix | Files | Effort |
|----|--------|-----|-------|--------|
| BUG-1 | **Feed pagination off-by-one** (dup posts, broken "load more") | `.range(offset, offset + limit - 1)`. | `actions/posts.ts:1030` | S |
| BUG-2 | WhoToFollow ignores server `isFollowing` | Seed `followingMap` from `result.users` `isFollowing`. | `components/feed/WhoToFollow.tsx:25` | S |
| BUG-3 | VoiceRecorder leaks blob URLs + AudioContexts | Track preview URL in ref + revoke; `audioContextRef.current?.close()` in `onstop`; `cleanup()` in start catch. | `Post/create/VoiceRecorder.tsx:66` | M |
| BUG-4 | Chat optimistic send duplicates on realtime echo | Dedup by message `id`; swap optimistic row by id. | `hooks/useChat.ts:208` | S |
| BUG-5 | Chat message-load stale overwrite | `cancelled`/`AbortController` guard before each `setMessages`. | `hooks/useChat.ts:165` | S |
| BUG-6 | Chat edit revert-on-failure is a no-op | Capture prior message; restore `content`/`isEdited` on failure. | `hooks/useChat.ts:305` | S |
| BUG-7 | Image alt_texts misalign on remove/reorder | Key alt text by URL (`Record<string,string>`); build at submit. | `Post/create/CreatePostModal.tsx:423` | M |
| BUG-8 | Minor React hygiene | `useIsOnline` re-subscribe (memo input), PullToRefresh listener churn (ref), TagInput blur timeout cleanup, poll/WhoToFollow stable keys + honest deps. | `useOnlineStatus.ts:146`, `PullToRefresh.tsx:93`, `TagInput.tsx:228`, `FeedList.tsx:108` | M |

---

## Phase 2 — Performance

> **✅ Core done in code (2026-06-20):** PERF-1 (denormalized `posts.like_count/comment_count/reblog_count` + `profiles.follower_count` via triggers; `batchFetchPostStats` now 1 query, not 3×N), PERF-2 (thread-length single query), PERF-3 (follower count via column), PERF-4 (`pg_trgm` GIN on `tags.name`), PERF-5 (indexes on `reblogged_from_id`, `(status, created_at)`), PERF-7 (`React.memo` on `InteractivePost`) — migration `20260620_perf_counters.sql` (**must be applied + backfills counts**). ✅ PERF-7 windowing done via dependency-free `content-visibility: auto` (`.cv-feed-item` on Reader posts, `.cv-tile` on Front Page river) — browser skips off-screen layout/paint, DOM/state intact, no library/measurement. ⏳ Only cursor/keyset pagination (PERF-8) remains optional (offset still used; deep-scroll DB cost only).

| ID | Ticket | Fix | Files | Effort |
|----|--------|-----|-------|--------|
| PERF-1 | **N+1 count queries** (60–130 round-trips/feed page) | Denormalized `like_count`/`comment_count`/`reblog_count` columns maintained by triggers (best), or grouped `count(*) … group by post_id` RPC. | `actions/shared/post-stats.ts:31` | L |
| PERF-2 | Thread-length N+1 | Single grouped `count(*) … where thread_id in (…) group by thread_id`. | `actions/posts.ts:1090` | S |
| PERF-3 | Per-author follower-count N+1 (For You) | Single grouped query for follower counts. | `actions/recommendations.ts:412` | S |
| PERF-4 | Tag expansion = 15× unindexed ILIKE | Enable `pg_trgm`; `gin (name gin_trgm_ops)` on `tags.name`; consider caching expansion per user. | `actions/recommendations.ts:103` + migration | M |
| PERF-5 | Missing indexes | Add `posts(reblogged_from_id) WHERE NOT NULL`; align chronological sort with index (order by `published_at` or add `posts(status, created_at DESC)`). | migrations | S |
| PERF-6 | Muted-tag filter after pagination (wrong page sizes) | Filter in the DB query before `.range()`; compute `hasMore` post-filter. | `actions/posts.ts:1148` | M |
| PERF-7 | No memo / no virtualization | `React.memo(InteractivePost)`; windowing via `@tanstack/react-virtual`. | `Post/InteractivePost.tsx`, `feed/FeedList.tsx` | M |
| PERF-8 | Offset pagination re-runs scoring each page | Keyset/cursor pagination for chronological; cache scored candidate set for recommendation feeds. | `feed/FeedClient.tsx:194`, `recommendations.ts:571` | L |

---

## Phase 3 — App-wide modernization

> **North star:** people migrating from Tumblr should feel they moved *forward*, not back. Modernization is in scope across every surface — feed, profiles, messaging, chrome, composer — not just the feed.
>
> The surface audits (feed, profile, messaging, chrome) surfaced the **same root causes everywhere**: brand pink `#F20D5E` is defined but barely used (teal monotony), there is **no theming/light mode at all**, **no motion layer** (zero `framer-motion`; only CSS keyframes), display font (Gloock) is unused, and typography is timid/low-contrast. So Phase 3 starts with a shared **Foundation** track that every surface redesign consumes — fix once, benefit everywhere.

### 3.0 — Design-system foundation (do FIRST; everything below depends on it)

| ID | Ticket | Status | What | Files | Effort |
|----|--------|--------|------|-------|--------|
| FND-1 | **Theming + light mode** | ✅ infra + chrome done | `next-themes` + `ThemeProvider`; `.light`/`.dark` token blocks in `globals.css` (dark = default, no regression); sun/moon toggle in sidebar; global chrome (sidebar/nav/layout) migrated to theme-aware `--vocl-border`/`--vocl-hover` tokens. **Residual (incremental):** ~780 hardcoded `white/x`–`black/x` alphas in other surfaces (chat, modals, some pages) need migrating for full light-mode polish. | `globals.css`, `layout.tsx`, `providers/ThemeProvider.tsx`, `layout/*` | L |
| FND-2 | **Brand-pink + token pass** | ✅ core done | Added semantic `--vocl-primary` (pink) / `--vocl-primary-hover`; applied to conversion CTAs (Follow, chat send, comment/voice send, composer "Post now", create FAB). Teal reserved for nav/structure. **Residual:** sweep of the remaining 760 `vocl-accent` usages is incremental (most are correctly structural). | `globals.css` + CTA components | M |
| FND-3 | **Motion primitives** | ✅ done | `framer-motion` + `src/lib/motion.ts` presets (springs, fadeUp/scaleIn/stagger, tap/hover); stagger entrance on Front Page tiles via `MotionConfig reducedMotion="user"`. Per-surface modal enter/exit ongoing. | `lib/motion.ts`, `frontpage/FrontPageGrid.tsx` | M |
| FND-4 | **Typography scale** | ✅ scale done | Type-scale utilities in `globals.css` (`.type-display-lg/display/heading/quote/body-lg/body/meta`) — Gloock for display/headings/quotes, confident normal-weight body. **Residual:** apply per surface (display names → PROF-4, post body → UX-4). | `globals.css` + shared text components | M |
| FND-5 | **Per-profile accent token** | ✅ done | `ProfileAccentScope` sets `--vocl-primary`/`--vocl-accent` per profile; `profiles.accent_color` column; accent picker in settings/appearance; applied on `/profile` + `/u`. Also added `profiles.feed_layout` so the feed toggle persists to profile + localStorage. | `ProfileAccentScope.tsx`, `actions/profile.ts`, migration `20260620_profile_prefs.sql` | M |

### 3a — Feed

> Kill the "feels like a form" effect; make content the hero with per-post-type personality. Build as a reviewable prototype branch.

| ID | Ticket | What | Files | Effort |
|----|--------|------|-------|--------|
| UX-1 | **Lighten the action bar** | Replace permanent black `#1f1f1f` slab with a translucent/light action row (or hover-reveal over content on desktop). Removes the biggest "form" signal. | `Post/Post.tsx` (`PostActionBar`) | M |
| UX-2 | **Per-post-type personality** | Quote → large serif; text → optional color/gradient backgrounds + real type hierarchy; ask → distinct question-bubble chrome; richer link cards. Extend the existing essay styling pattern to all types. | `Post/Post.tsx` (`TextContent`), `content/*` | L |
| UX-3 | **Microinteractions** | Like-burst (heart particles), double-tap-to-like on images, echo ripple on reblog, spring on count changes. Reuse `globals.css` keyframes. | `Post/Post.tsx`, `globals.css`, `InteractivePost.tsx` | M |
| UX-4 | **Raise text contrast & scale** | Body text from `text-neutral-700 font-light text-sm` → darker, ~`text-base`, normal weight. | `Post/Post.tsx` (`TextContent`) | S |
| UX-5 | **Lean into brand pink** | Use `#F20D5E` for likes/active states/accent moments (currently teal-dominant, pink barely used). | `globals.css` tokens + components | S |
| UX-6 | **Let images breathe** | Relax aspect clamp for portrait; optional masonry 2-col mode on Explore. | `Post/Post.tsx` (`ImageContent`), `app/(main)/explore` | M |
| UX-7 | **Liveliness signals** | "N new posts ↑" pill, live counts, inline trending-tag chips, "because you follow X" context. | `feed/FeedClient.tsx`, `feed/FeedList.tsx` | M |

**Status (2026-06-20):** ✅ UX-1 (light action bar + hairline rule), UX-2 (Ask/essay personality), UX-3 (like pop+burst, CSS), UX-4 (confident body type + Gloock essay titles), UX-5 (pink reblog FAB), UX-6 (taller portraits) shipped. ⏳ UX-7 (liveliness "new posts" pill) not started — needs realtime wiring.

### 3b — Profiles

> Tumblr's identity *is* custom blogs; Be.Vocl's profile is generic and teal. Two divergent profile pages (`/profile/[username]` vs public `/u/[username]`) also need unifying.

| ID | Ticket | What | Files | Effort |
|----|--------|------|-------|--------|
| PROF-1 | **Profile customization** (signature Tumblr lever) | Per-profile accent (via FND-5), header position/blur controls, 2-3 layout presets. | `components/profile/*`, `globals.css` | L |
| PROF-2 | **Hero banner** | Go taller (`h-56 md:h-72`); drop the heavy `from-background` overlay that washes out custom imagery; thin bottom scrim only; subtle parallax/scale-on-scroll. | `ProfileHeader.tsx:91` | M |
| PROF-3 | **Stats above the fold** | Clickable Posts · Followers · Following row in the header (currently buried in tab pills) — drives the follow decision. | `ProfileHeader.tsx` | S |
| PROF-4 | **Follow = pink primary CTA** + editorial type | Make Follow the pink conversion CTA; set display name in Gloock; bump bio to `text-base/relaxed` (uses FND-2/4). | `ProfileHeader.tsx:140,169` | S |
| PROF-5 | **Profile motion** | Follow→Following spring + checkmark + pink burst, avatar hover ring, count-up stats, staggered post fade-in. | `components/profile/*` | M |
| PROF-6 | **Fix the lies / unify pages** | Remove or wire up the always-green "online" dot (`ProfileHeader.tsx:136`); replace `via.placeholder.com` fallbacks with initial-gradient avatar; unify `/profile` and `/u` onto one `ProfileHeader`. | `ProfileHeader.tsx:136`, `app/u/[username]/page.tsx` | M |

### 3c — Messaging

> Single 384px stacked slide-over even on desktop is the most "50 years ago" signal. Missing reactions/replies/voice; a11y gaps. (Pairs with BUG-4…6 chat correctness fixes.)

| ID | Ticket | What | Files | Effort |
|----|--------|------|-------|--------|
| MSG-1 | **Responsive two-pane / full-screen** | List + open thread side-by-side ≥`md`; true full-screen `/messages` route on mobile instead of an overlay widget. | `ChatSidebar.tsx:296` | L |
| MSG-2 | **Real ISO timestamps + grouping** | Send ISO timestamps (not pre-formatted strings) → group consecutive same-sender messages, "Today/Yesterday" dividers, "Seen 2:14 PM" on last own message. **Also unblocks the broken pagination cursor.** | `actions/messages.ts:266`, `useChat.ts:223`, `MessageBubble.tsx` | M |
| MSG-3 | **Reactions** | Hover/long-press emoji bar + reaction chip row; `message_reactions` table + realtime. Table-stakes for migrants. | `MessageBubble.tsx`, new migration | M |
| MSG-4 | **Inline reply / quote** | Swipe-to-reply (mobile) + hover reply (desktop) with quoted snippet. | `MessageBubble.tsx:166` | M |
| MSG-5 | **Voice notes + media polish** | Hold-to-record voice with waveform; tap-to-zoom lightbox on image bubbles. | `ChatInput.tsx:221`, `MessageBubble.tsx:85` | M |
| MSG-6 | **Bubble + motion polish** | Grouped-tail logic, tighter `max-w`, send/receive spring instead of global `scrollIntoView` jump, pink accents. | `MessageBubble.tsx`, `ActiveChat.tsx:78` | S |
| MSG-7 | **Chat a11y** | `role="dialog"`/`aria-modal`/focus-trap/Esc-to-close on the panel; `role="log"`/`aria-live` on the message list; `aria-label` on icon buttons. | `ChatSidebar.tsx:296` | S |
| MSG-8 | **Finish stubs** | Block/Report currently `toast.info("coming soon")`. | `ChatSidebar.tsx:240,245` | S |

### 3d — Chrome, composer & notifications

> The 1,940-line composer is the single biggest opportunity — Tumblr's weakest point, where Be.Vocl can win.

| ID | Ticket | What | Files | Effort |
|----|--------|------|-------|--------|
| CHR-1 | **Composer rebuild** | Split the monolith by post-type; TipTap `BubbleMenu`/slash-commands, headings/blockquote/code, inline link entry (kill `window.prompt`/`alert` at `RichTextEditor.tsx:100`), drag-drop + paste-to-upload, live preview, **autosave drafts** (current guard discards work on misclick). | `Post/create/CreatePostModal.tsx`, `RichTextEditor.tsx` | L |
| CHR-2 | **Mobile composer = full-screen flow** | Dedicated mobile composer screen with sticky post bar + step transitions; FAB is currently `sm:flex` (hidden on phones), so mobile leans on the fragile `/create`→`router.back()`. | `create/page.tsx`, `CreatePostFAB.tsx` | M |
| CHR-3 | **Command palette (⌘K)** | Navigation, search, "new text post," theme toggle, jump-to-user. Infra already exists. | `KeyboardShortcuts.tsx` | M |
| CHR-4 | **Richer notifications** | Grouping ("@a and 4 others liked"), filter tabs (All/Mentions/Follows), inline follow-back/reply, avatar stacks. | `notifications/NotificationItem.tsx` | M |
| CHR-5 | **Nav IA cleanup** | Unify Search vs Explore naming; consolidate the **three** Messages entry points (sidebar button, bottom-nav button, floating edge circle at `layout.tsx:165`); replace the mobile "…" grab-bag with a proper account bottom-sheet. | `layout/*`, `layout.tsx:165` | M |
| CHR-6 | **Onboarding/empty-state polish** | Replace the 3s-timeout onboarding race; add empty-state coaching + one-time composer tooltip flaunting essays/queue/time-capsule (features Tumblr lacks). | `layout.tsx:88`, feed/notifications empties | M |

---

## Suggested sequencing
1. **Week 1:** Phase 0 (SEC-1…5) + BUG-1 (one-liner, ships with security). Launch-blocker clearance.
2. **Week 2:** Phase 1 security (SEC-6…14) + correctness bugs (BUG-2…8).
3. **Week 3:** PERF-1 (counters) + PERF-4/5/7 — biggest scale wins.
4. **Modernization track (parallel, ongoing):**
   - **First:** Phase 3.0 foundation (FND-1…5) — theming, pink, motion, type. Everything else compounds on it.
   - **Then, surface by surface** (each a reviewable prototype branch): Feed (UX-1→3 first) → Profiles → Messaging → Chrome/Composer. Composer (CHR-1) and Profile customization (PROF-1) are the two "wow, this beats Tumblr" headline features — schedule them where they'll be seen.

## Audited clean / good practices (no action)
Paddle webhook HMAC verification · email webhook timing-safe compare · no tracked `.env` / hardcoded keys · service-role key never in client · all `dangerouslySetInnerHTML` wrapped in DOMPurify · upload keys namespaced under `user.id` · realtime channels cleaned up · `useLinkPreviews`/`useNotifications` hooks correct · heavy dialogs already `dynamic()`-loaded · `next/image` used.
