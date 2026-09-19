# be.vocl — Project Overview & Status

_Last updated: 2026-09-19. This is the canonical, current description of the project. The other Markdown files in the root are historical planning/audit documents kept for reference (see [Repository documents](#repository-documents)); where they disagree with this file, this file wins._

---

## What be.vocl is

**be.vocl is a personal daily broadsheet with a voice** — a voice-first social blogging platform, positioned as a modern successor to Tumblr. Instead of a flat stream of identical cards, posts come in rich, distinct types (essay, ask, poll, audio, gallery, image, text) and are given an **editorial** treatment: a front page with a lead story, descending tiers, labelled sections and pull quotes, with hierarchy derived algorithmically rather than by a human editor.

### Core principles

- **Voice is first-class.** Async voice notes, asks, answers and reactions run throughout the product. Voice is always auto-transcribed (for accessibility, search and moderation), always shows a waveform + duration before play, and text is always equal-status. Deliberately **no live audio** (the lesson from Clubhouse/Airchat).
- **Write under your name — or a name you choose.** Pen names are a first-class idea in the product's voice. (Note: a true multi-identity system is not yet built — see [What's left](#whats-left--what-should-be-done).)
- **You decide who sees every post.** Public-by-default with per-post audience control (`public` / `members` / `followers`), plus a **hard NSFW wall**: sensitive content never appears on the logged-out public web or as a lead/feature tile, regardless of viewer settings. Creator-set content warnings are distinct from the platform NSFW flag.
- **Adults only (21+).** Enforced at signup with a self-attested date of birth (server-side backstop in the profile-creation trigger), and DOB gates sensitive content thereafter.
- **No ads, no data brokers, no doomscroll algorithm.** Discovery is interest-based, not engagement-maximising. Analytics is **self-hosted (OpenPanel)** behind a neutral same-origin proxy — no third-party ad tracking, cookieless.
- **Unique but immediately usable.** New users land in a familiar single-column **Reader**; the **Front Page** broadsheet is opt-in and never forced. Mobile always renders Reader.
- **Privacy & data rights.** Invite-only during beta; GDPR/CCPA data export and account deletion (anonymisation) are wired.

---

## Design system — "the evening broadsheet"

A newspaper visual language with two editions:

- **Late edition (dark, default):** paper `#121212`, warm ink `#ECE7DF` (never pure white), accent `#D10F50` (used only as a mark — wordmark, kicker, one primary action, active-tab underline), hairline rules `#2A2724`.
- **Newsprint edition (light):** paper `#F3EFE7`, ink `#14120F`, same accent, subtle grain.
- **Type:** Gloock (display), Source Serif 4 (body), IBM Plex Sans (UI/meta, uppercase tracked slugs), IBM Plex Mono (slugs/specs).
- **Rules, not cards:** radius 0, no shadows/glows/gradients; hairline rules and generous whitespace. `font-synthesis: none` app-wide (Gloock is single-weight — never synthesise bold).

---

## Tech stack & architecture

- **Framework:** Next.js 16 (App Router, Turbopack, `output: "standalone"`), React 19, TypeScript, TailwindCSS 4 (CSS-first `@theme`). Edge gating via `src/lib/supabase/proxy.ts` — **never** a `middleware.ts` (build conflict on this project).
- **Backend:** Supabase — Postgres + Auth + Realtime + Row-Level Security. Server Actions throughout (`src/actions/**`). Schema lives in `supabase/migrations/**` (applied to Supabase manually / out-of-band).
- **Media:** Cloudflare R2, presigned uploads namespaced per user, content-type allowlist + size cap bound into the signature.
- **Email:** React-Email templates via **Resend** (`noreply@be.vocl.app`).
- **Payments:** Paddle (tips + paid verification), HMAC-verified webhooks. _Config-gated: needs price-IDs set to go live._
- **Moderation:** SightEngine image scanning on upload (nudity / gore / face-age). Fails **closed in production** if unconfigured.
- **Analytics:** self-hosted OpenPanel via a first-party proxy (`src/app/api/i/[...path]`), ad-blocker resistant, cookieless.
- **Optional integrations:** OpenAI (voice transcription), Spotify, Unsplash, Giphy — each returns a graceful fallback when its key is absent.

### Data-model highlights

- **Roles:** `profiles.role` int — 0 user, (1 trusted), 5 moderator, 10 admin. `lock_status`: `unlocked` / `restricted` / `banned` (+ `banned_ips`).
- **Moderation & data rights:** `reports`, `flags` (post-flags), `appeals`, `escalation_history`, `data_export_requests`, `posts.moderation_status`.
- **Performance:** denormalised counters (`posts.like_count/comment_count/reblog_count`, `profiles.follower_count`) maintained by DB triggers; `pg_trgm` GIN index on tags; `content-visibility` windowing in the feed.
- **Messaging:** membership-based conversations (`conversation_participants` + a SECURITY DEFINER `is_conversation_member` RLS helper + `get_conversation_previews` RPC, all N-participant-safe). Supports 1:1 DMs, **groups** (`is_group`/`name`/`owner_id`), message **requests**, and **shared posts**.
- **Security baseline:** CSP/HSTS + security headers, SSRF guards on image/OG proxies, timing-safe HMAC on webhooks, DOMPurify on all rendered HTML, privileged profile columns REVOKE'd + trigger-guarded, RLS on all PII tables, rate limiting on uploads/reports/messages/auth.

---

## Current status

**Invite-only private beta. Feature-complete, not yet launch-hardened.** Access is gated by invite codes (`VOCL-XXXX-XXXX`) at signup, plus an optional per-user **beta gate**: the beta deployment sets `BETA_ACCESS_REQUIRED`, and `proxy.ts` sends any logged-in user who is not an admin and not `profiles.beta_access = true` to `/beta-closed`. On production the env var is unset, so the gate is off.

**`main` and `beta` are unified** — same code, differing only by that env var (and their deployment config). Ship to `main`; `beta` follows.

### Built and shipping

Auth (password + magic link + invite) · onboarding · **21+ age gate** · posting for all types (text/image/video/audio/gallery/poll/ask) with editorial renderers · feed (Reader + Front Page broadsheet) · explore/search · profiles, follows/subscribers, blocks/mutes · **messaging** (1:1, groups, requests, shared-post-in-message, voice notes, reactions, read receipts, typing) · communities/desks (`/c/[slug]`) · queue & scheduling · notifications · tips & paid verification (Paddle, config-gated) · admin moderation (reports, flags, appeals, audit, email, users + dossier) · multi-account switching · transactional email · settings · legal pages (Terms, Privacy) · the broadsheet redesign across the whole app.

---

## What's left / what should be done

### 🔴 Launch blockers (before dropping the invite gate for the open public)

- **CSAM / NCMEC reporting.** Auto-mod holds suspected content and notifies staff, but there is **no NCMEC/CyberTipline report, evidence preservation, or law-enforcement pipeline** — while the Terms promise NCMEC reporting. Needs real trust-&-safety/legal handling + NCMEC registration. Do **not** hand-roll.
- **Existing-user age gate.** The 21+ gate covers new signups; existing DOB-less accounts need a one-time blocking "confirm your date of birth" interstitial. (Age is self-attested, not ID-verified — a product decision.)

### 🟠 Compliance & security

- **Legal:** add a `/dmca` page + registered agent (§512 safe harbor), a standalone community-guidelines page, and email one-click unsubscribe / `List-Unsubscribe` (CAN-SPAM). Refresh + legally review the Terms.
- **SightEngine** now fails closed in production; keep the keys set so posting isn't blocked.

### 🟡 Operational

- **Crons:** schedules live in `vercel.json` but the app deploys on **Coolify** — the queue publisher, scheduled-post, data-export and digest jobs run only if Coolify Scheduled Tasks invoke `scripts/trigger-cron.mjs` (see `DEPLOY.md`). Verify all four show green, or those features are silently dead.
- **Rate limiting** is in-memory (`src/lib/rate-limit.ts`) — resets per deploy, not shared across instances. Move to Redis/Upstash before scaling past one instance.
- **Observability:** no error monitoring (no Sentry; `console.error` only; no `global-error.tsx`).
- **Tests:** none. Add error monitoring + smoke tests over auth / posting / moderation at minimum. The only current deploy gate is `typecheck` (the server build skips types via `ignoreBuildErrors`; lint is non-blocking).
- **Verify:** whether multiple-choice polls are backed end-to-end (`poll_votes`); the open items in `PERF-AUDIT-2026-07-30.md` (feed re-render on scroll-append, chat list refetch on every message, unbounded message-history fetch, `<Image fill>` without `sizes`).

### 🟢 Monetisation (config-gated)

- Set the Paddle price-IDs and test tips + paid verification end-to-end, or hide the buttons (they currently show "temporarily unavailable").

### Future / differentiation (post-launch backlog)

- **True multi-identity / pen-name system** (multiple identities per account) — today "sending as" is display-name only.
- Monetisation tiers (subscriptions, subscriber-only content, commissions, promoted posts, paid API).
- Mobile app (PWA/RN); public API + webhooks; **ActivityPub / Fediverse** bridge.
- Co-authored posts; public/shared bookmark collections + reading lists; text-span annotations; subscriber weekly digest; podcast-style audio series + RSS; niche-finder.
- Opt-in AI helpers (auto alt-text, suggested content warnings, tag suggestions); true-black dark mode; full accessibility/screen-reader audit; RTL.
- In-thread "share a post" button; NewChatModal is styled (done) — remaining chat polish as it comes up.

### Explicitly cut / decided against

Custom domains · per-blog HTML theming · quote/link/chat post types (enum sprawl) · social OAuth login (privacy-conscious audience).

---

## Running & deploying

- **Local dev:** `npm run dev` (port 3111). `npm run typecheck` is the primary quality gate; `npm run lint` and `npm run build` also exist. (Note: on this WSL setup, `npm run dev` can fail under Turbopack on `/mnt/g`.)
- **Deploy:** see **`DEPLOY.md`** — Coolify + Nixpacks, standalone server, the full env-var table, the four Scheduled Tasks, and the pre-invite checklist (disable open signups, seed an admin via `role = 10`, verify crons).
- **Analytics infra:** see **`OPENPANEL-SETUP.md`** — self-hosting OpenPanel; be.vocl needs `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` and `OPENPANEL_API_URL`.

---

## Repository documents

**Living references (keep current):**
- `PROJECT.md` — this file (source of truth for what/where/next).
- `DEPLOY.md` — deploy runbook.
- `OPENPANEL-SETUP.md` — analytics/infra runbook.

**Historical (planning & audits — kept for reference, superseded by this file):**
`ROADMAP.md`, `FEATURE-PLAN.md`, `NEXT-PHASE-PLAN.md`, `MODERATION_PLAN.md`, `GROUP-CHAT-PLAN-2026-08-26.md` (group chat since shipped), `AUDIT-AND-REDESIGN-PLAN.md`, `BEVOCL-REVAMP.md`, `READINESS-AUDIT-2026-07-09.md`, `PERF-AUDIT-2026-07-30.md`, `TODO.md`, `vocl - Testing.md` (a manual-QA checklist that can be revived as a regression template).
