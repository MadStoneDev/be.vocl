# be.vocl — Full Codebase Audit Report

**Date:** 2026-03-04
**Scope:** Security, Performance, UX/UI, Code Quality, Architecture, Feature Gaps

---

## Table of Contents

1. [Security & Data Integrity](#1-security--data-integrity)
2. [Performance & Optimization](#2-performance--optimization)
3. [UX/UI Issues](#3-uxui-issues)
4. [Code Quality](#4-code-quality)
5. [Architecture](#5-architecture)
6. [Feature Gaps](#6-feature-gaps)
7. [Infrastructure & DevOps](#7-infrastructure--devops)
8. [Priority Roadmap](#8-priority-roadmap)

---

## 1. Security & Data Integrity

### CRITICAL

| # | Issue | File(s) | Lines |
|---|-------|---------|-------|
| S1 | **Template literal injection in `.or()` filters** — User IDs interpolated into Supabase `.or()` strings. If any non-UUID value reaches these, query manipulation is possible. | `actions/follows.ts`, `actions/account.ts` | 45-46, 276-277, 237 |
| S2 | **Missing owner verification on `getCodeUses()`** — Any authenticated user can view who used ANY invite code, exposing invite usage patterns. | `actions/invites.ts` | 408-452 |

### HIGH

| # | Issue | File(s) | Lines |
|---|-------|---------|-------|
| S3 | **Admin check endpoint leaks role details** — Returns exact role number, `isAdmin`, `isModerator` flags. Aids reconnaissance. Should only return `authorized: boolean`. | `api/admin/check-access/route.ts` | — |
| S4 | **In-memory rate limiter** — Uses `Map` for rate limiting. Ineffective with multiple Railway instances. Needs Redis. | `lib/rate-limit.ts` | 11-12 |
| S5 | **Missing auth check on `getProfileLinks()`** — Fetches profile links for any user without authentication. Relies solely on RLS. | `actions/profile.ts` | 281-310 |
| S6 | **Confusing double `.or()` in `blockUser()`** — The chained `.or()` filter logic is hard to audit and may not correctly delete bidirectional follows. | `actions/follows.ts` | 272-277 |

### GOOD (Already Solid)

- XSS protection via `sanitizeHtmlWithSafeLinks()` on all `dangerouslySetInnerHTML`
- CSRF protection with timing-safe comparison and origin validation
- Webhook signature verification (Paddle, Auth) using `crypto.timingSafeEqual`
- File upload validation (type whitelist, size limits, user-scoped paths)
- Ownership verification on posts, comments, messages, profile links
- Input validation (username format, reserved words, URL protocol checks)
- Security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options)

---

## 2. Performance & Optimization

### CRITICAL — N+1 Query Problems

| # | Issue | File | Lines | Impact |
|---|-------|------|-------|--------|
| P1 | **`searchUsers()` — 2 queries per user** (follower count + follow status). 20 results = 40 queries. | `actions/search.ts` | 136-166 | Should use `batchIsFollowing()` + batch count |
| P2 | **`formatPosts()` — 2 queries per post** (like count + comment count). `batchFetchPostStats()` already exists but isn't used here. | `actions/search.ts` | 379-412 | Should reuse existing batch helper |
| P3 | **`getSuggestedUsers()` — same N+1 pattern** as `searchUsers()`. | `actions/search.ts` | 537-565 | Same fix as P1 |

### HIGH

| # | Issue | File | Lines |
|---|-------|------|-------|
| P4 | **Missing database indexes** — Queries filter on `posts.status`, `posts.author_id`, `follows.follower_id+following_id`, `notifications.recipient_id+is_read`, `post_tags.post_id+tag_id` without composite indexes. | — | — |
| P5 | **Notifications fetch full post content** — Pulls entire `content` JSON (can be 1KB+) just for a notification preview. | `actions/notifications.ts` | 52-90 |
| P6 | **`getCommentedPosts()` fetches 3x limit** then deduplicates in JS. Should use `DISTINCT ON` in SQL. | `actions/posts.ts` | 837-858 |
| P7 | **Recommendations fetch ALL followers** for all candidate post authors. Could be millions of rows. | `actions/recommendations.ts` | 275-276 |

### MEDIUM

| # | Issue | File | Lines |
|---|-------|------|-------|
| P8 | **Image lightbox uses `priority`** — Eager loads modal content that should be lazy. | `ImageLightbox.tsx` | 108 |
| P9 | **Gallery images missing explicit lazy loading** | `GalleryContent.tsx` | 75-80 |
| P10 | **No Suspense boundaries on profile tabs** — Waterfall fetches when switching tabs. | `profile/[username]/page.tsx` | — |
| P11 | **Offset pagination on feed** — Breaks when new posts are inserted (duplicates/gaps). Should use cursor-based. | `FeedClient.tsx` | — |
| P12 | **No HTTP caching headers** on server actions. Trending tags, public profiles etc. could benefit from `Cache-Control`. | All actions | — |
| P13 | **No code splitting** for heavy feed components (`InteractivePost`, content types). | `FeedClient.tsx` | 1-9 |
| P14 | **`revalidatePath("/feed")` too broad** — Revalidates entire feed for small changes. Should target specific paths. | `actions/posts.ts` | 179, 339-340 |

---

## 3. UX/UI Issues

### Missing Loading & Error Feedback

| # | Issue | File | Lines |
|---|-------|------|-------|
| U1 | **Like toggle failure is silent** — Only logged to console, no user feedback. | `hooks/useLike.ts` | 54 |
| U2 | **Comment add failure is silent** — Error not shown to user. | `hooks/useComments.ts` | 59 |
| U3 | **Chat send failure is silent** — No error toast if `onSend` fails. | `chat/ChatInput.tsx` | 127-138 |
| U4 | **Profile tab switch shows no loading state** — Likes/comments tabs appear empty until fetch completes. | `profile/[username]/page.tsx` | 488-517 |
| U5 | **No confirmation for clearing all notifications** — One click wipes everything. | `notifications/page.tsx` | 59-67 |
| U6 | **Notification fetch failures are silent** — Sets empty array without alerting user. | `notifications/page.tsx` | 27-31 |

### Accessibility

| # | Issue | File | Lines |
|---|-------|------|-------|
| U7 | **ReblogFabMenu not keyboard navigable** — Uses absolute positioning with JS, no focus management. | `Post.tsx` | 271-329 |
| U8 | **Dialog focus trap incomplete** — Only handles Tab/Shift+Tab, focus can escape via other keys. | `ui/Dialog.tsx` | 52-66 |
| U9 | **Inline spinners lack aria-label** — Many places use `<IconLoader2 className="animate-spin" />` without accessibility. | Multiple | — |
| U10 | **Low contrast text** — `text-neutral-400` on light `#EBEBEB` background in comment counts. | `Post.tsx` | 190-195 |
| U11 | **Keyboard shortcuts undiscoverable** — Shortcuts exist (`n`=new post, `/`=search, etc.) but no help modal or visual hints. | `hooks/useKeyboardShortcuts.ts` | 54-113 |

### UI Consistency

| # | Issue | File | Lines |
|---|-------|------|-------|
| U12 | **Hardcoded colors instead of theme tokens** — `#EBEBEB`, `rgba(19,19,19,0.9)`, `bg-white` in dark-themed app. | `Post.tsx`, `ConfirmDialog.tsx` | 112, 175, 89 |
| U13 | **ConfirmDialog uses white background** — Doesn't match dark theme. | `ui/ConfirmDialog.tsx` | 89 |
| U14 | **Mixed modal implementations** — Some use `Dialog` component, some use raw divs with backdrop. | `ReportDialog.tsx`, `Dialog.tsx` | — |
| U15 | **Inconsistent button usage** — `Button` component exists but many places use raw `<button>` with repeated classNames. | Multiple | — |

### Missing UX Patterns

| # | Issue |
|---|-------|
| U16 | **No skeleton loaders** for feed pagination or profile tab content |
| U17 | **No exit animations** on dialogs (enter animation exists, close is instant) |
| U18 | **No unfollow confirmation** — Unfollow is immediate with only a toast after |
| U19 | **Profile not-found shows generic error modal** instead of dedicated 404 page |

---

## 4. Code Quality

### Overly Large Components

| # | File | Lines | Issue |
|---|------|-------|-------|
| C1 | `Post.tsx` | ~860 | Header, action bar, reblog menu, comments, tags overlay, expanded panels — all in one file. Split into 5-6 components. |
| C2 | `profile/[username]/page.tsx` | ~766 | Data fetching, follower list, follow state, modals, inline `FollowerCard` component. Extract sub-components. |
| C3 | `chat/ChatInput.tsx` | ~273 | GIF picker, emoji picker, media upload all inline. |

### Duplicated Patterns

| # | Issue | Recommendation |
|---|-------|----------------|
| C4 | Auth check repeated in 15+ action files: `const { data: { user } } = await supabase.auth.getUser(); if (!user) return ...` | Extract `requireAuth()` helper |
| C5 | Profile role check repeated in admin actions | Extract `requireRole(minRole)` helper |
| C6 | Toast messages hardcoded in many components instead of using `toastMessages` from `useToast.ts` | Centralize toast messages |
| C7 | Comment input implemented inline in `Post.tsx` instead of reusable component | Extract `CommentInput` component |

### State Management

| # | Issue | File | Lines |
|---|-------|------|-------|
| C8 | **Race condition on feed tab switching** — Quick tab switches can cause in-flight requests to resolve out of order. | `FeedClient.tsx` | 134-184 |
| C9 | **Stale closure in `useComments`** — `comments.filter()` runs async after state update, may use stale array. | `hooks/useComments.ts` | 88-90 |
| C10 | **Memory leak risk in useAuth** — `setTimeout` in async callback; if component unmounts during timeout, state update hits unmounted component. | `hooks/useAuth.ts` | 74-80 |
| C11 | **Deep prop drilling in Post** — Callbacks passed 5+ levels. Post actions context would help. | `Post.tsx` | — |

### TypeScript

| # | Issue |
|---|-------|
| C12 | `as any` cast on every Supabase query due to type compatibility issue with `PostgrestFilterBuilder` |
| C13 | `content?: any` on post interfaces — should use discriminated union by `postType` |
| C14 | Pre-existing implicit `any` in `useAuth`, `useChat`, `useOnlineStatus`, `useTypingPresence` |

---

## 5. Architecture

### Structural Issues

| # | Issue | Impact |
|---|-------|--------|
| A1 | **No repository/data access layer** — Raw Supabase queries scattered across 26 action files. Schema changes require touching many files. | High maintenance cost |
| A2 | **No service/business logic layer** — Post creation mixes 20+ validation steps with DB operations and moderation. | Untestable business rules |
| A3 | **Inconsistent SSR patterns** — Feed uses server component + client hydration (good). Profile is fully client-side with `useEffect` fetching (inconsistent). | Unpredictable performance |
| A4 | **No environment validation** — Critical env vars used but never validated at startup. Causes mysterious runtime failures. | Debugging difficulty |
| A5 | **No centralized config** — Email settings, rate limits, roles, constants scattered across files. | Discovery difficulty |
| A6 | **Monolithic action files** — `posts.ts` has 9+ exports handling create, read, update, delete. Should split by concern. | Code navigation difficulty |

### Missing Abstractions

| # | Recommendation |
|---|----------------|
| A7 | `requireAuth()` / `requireRole(n)` wrappers for server actions |
| A8 | Repository pattern for common queries (posts, profiles, follows) |
| A9 | Event system for side effects (notifications, email) instead of inline calls |
| A10 | Standardized error codes + messages instead of ad-hoc strings |

---

## 6. Feature Gaps

### Missing (High Value)

| # | Feature | Notes |
|---|---------|-------|
| F1 | **Bookmarks / Saved Posts** | No table, no UI. Core social feature. Simple to add. |
| F2 | **Real-time Notifications** | Currently poll-based only. Need WebSocket/SSE for live updates. |
| F3 | **Creator Analytics** | No post views, engagement rates, audience insights. |
| F4 | **External Sharing** | No "share to Twitter/LinkedIn" or copy-link button. |
| F5 | **@ Mention Autocomplete** | Mentions are processed server-side but no typeahead in editor. |
| F6 | **Mute Words / Content Filtering** | Can't filter posts by keywords. |

### Missing (Medium Value)

| # | Feature | Notes |
|---|---------|-------|
| F7 | **Block List UI** | Blocking works but users can't see/manage their block list. |
| F8 | **Search Filters** | No date range, post type, or engagement filters on search. |
| F9 | **Hashtag Autocomplete** | No suggestions when typing hashtags in post editor. |
| F10 | **Post Scheduling UI** | Cron + queue system exists, but no scheduling UI for initial posts (only reblogs). |
| F11 | **Keyboard Shortcut Help Modal** | Shortcuts exist but are completely undiscoverable. |
| F12 | **Language / Locale Preference** | UI is hardcoded English. |

### Missing (Lower Priority)

| # | Feature | Notes |
|---|---------|-------|
| F13 | Account deletion workflow (GDPR) | Only `lock_status` suspension exists |
| F14 | Data export/download | `requestDataExport()` exists but unclear if complete |
| F15 | Push notifications (web) | No service worker for push |
| F16 | 2FA / Recovery codes | No second factor auth |
| F17 | Login history / Active sessions | No session management |
| F18 | Notification batching / Digest control | Email digest template exists, frequency control missing |
| F19 | Tag discovery / Trending UI | `getTrendingTags()` exists, no dedicated UI page |
| F20 | Post performance metrics (views/impressions) | No view tracking |

---

## 7. Infrastructure & DevOps

### Missing

| # | Item | Severity |
|---|------|----------|
| I1 | **No tests** — No unit, integration, or E2E tests | Critical |
| I2 | **No CI/CD pipeline** — No GitHub Actions, no automated checks on PR | Critical |
| I3 | **No error tracking** — Sentry integration commented out | High |
| I4 | **No health check endpoint** — Needed for Railway container orchestration | High |
| I5 | **No structured logging** — Only `console.error/log` | High |
| I6 | **No pre-commit hooks** — No Husky/lint-staged | Medium |
| I7 | **No database migrations in repo** — Schema changes untracked | Medium |
| I8 | **No API documentation** | Low |
| I9 | **No README** | Low |

---

## 8. Priority Roadmap

### Immediate (Week 1) — Security & Critical Bugs

- [ ] **S1**: Replace template literal `.or()` filters with parameterized queries
- [ ] **S2**: Add owner verification to `getCodeUses()`
- [ ] **S3**: Strip role details from admin check endpoint
- [ ] **P1-P3**: Fix N+1 queries in search — reuse `batchFetchPostStats()` and `batchIsFollowing()`
- [ ] **U1-U3**: Add error toasts for like, comment, and chat failures

### Short-term (Week 2-3) — Performance & UX

- [ ] **P4**: Add composite database indexes
- [ ] **P5**: Slim down notification query payload
- [ ] **P11**: Switch feed to cursor-based pagination
- [ ] **U4**: Add loading states for profile tab switches
- [ ] **U5**: Add confirmation for "clear all notifications"
- [ ] **U12-U13**: Replace hardcoded colors with theme tokens
- [ ] **C1-C3**: Split oversized components (`Post.tsx`, profile page, `ChatInput`)
- [ ] **C4-C5**: Extract `requireAuth()` / `requireRole()` helpers

### Medium-term (Week 4-6) — Features & Architecture

- [ ] **F1**: Implement bookmarks/saved posts
- [ ] **F4**: Add external share / copy-link
- [ ] **F5**: Add @ mention autocomplete in editor
- [ ] **F11**: Add keyboard shortcut help modal
- [ ] **S4**: Migrate rate limiter to Redis
- [ ] **A4**: Add startup environment validation
- [ ] **I3**: Re-enable Sentry error tracking
- [ ] **I4**: Add `/health` endpoint

### Long-term (Ongoing)

- [ ] **F2**: Real-time notifications (WebSocket/SSE)
- [ ] **F3**: Creator analytics dashboard
- [ ] **I1**: Add test infrastructure (Vitest + Playwright)
- [ ] **I2**: Set up CI/CD pipeline
- [ ] **A1-A2**: Introduce repository + service layers
- [ ] **F16**: 2FA support
- [ ] **F13**: GDPR account deletion workflow
