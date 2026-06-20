# Be.Vocl — The Editorial Revamp

_The product/design north-star plan. Engineering remediation (security, perf, correctness, foundation tokens, per-surface modernization) lives in the companion `AUDIT-AND-REDESIGN-PLAN.md`; this document is the **identity** layer that sits on top of it._

Generated 2026-06-20.

---

## 1. Vision & positioning

> **Be.Vocl is a personal daily broadsheet with a voice.**

Two assets nobody else combines:

1. **Rich, distinct post types** (essay, ask, poll, audio, gallery, quote, thread) — Tumblr flattens these into one uniform stream. An editorial layout's whole reason to exist is to give different content different treatment. We already have the raw material a front page needs.
2. **The name is VOCL.** No major text-social platform has made *voice* first-class across every interaction. Async voice (notes, asks, answers, reactions) is low-friction and avoids the live-audio attention trap that sank Clubhouse/Airchat.

**Primary inspiration: The New York Times homepage** — hero + descending tiers + labeled sections + pull quotes, with hierarchy derived *algorithmically* (we have no human editor). Vibe references to keep it modern, not stuffy: Are.na, Cosmos, The Pudding, Aeon. The grammar is NYT; the feel is calm-modern-dense.

**The through-line for every surface:** Gloock display serif for mastheads/headlines, Lexend for body, hairline rules instead of heavy cards, generous whitespace, brand pink `#F20D5E` for conversion, the editorial type scale (already shipped in `globals.css`).

**Non-negotiable constraint:** *unique but immediately usable.* New users land in a familiar single column; the bold broadsheet is something they opt into, never the forced first impression.

---

## 2. The four headline initiatives

These are the new, identity-defining builds. Each is grounded in a code-level spec.

### A. The Front Page — broadsheet feed (toggle)

A NYT-style editorial grid that sits **beside** the current single column, toggled per user. Built entirely off the data already flowing through `FeedClient → FeedList` — **no second fetch.**

**Modes:** **Reader** (current single column — default, always what mobile gets) and **Front Page** (broadsheet grid, `lg`+ only). Mobile always renders Reader.

**Grid:** 12-col CSS grid at `xl` (break out of `max-w-xl` → `max-w-[1280px]`), 8-col at `lg`, single column below. Gutters `gap-x-8 gap-y-10`. **Hairline rules** (`--vocl-border`), not cards — flat tiles, no shadow/rounded corners (the deliberate break from Reader's `shadow-xl rounded-br-[40px]`). Section bands separated by a full-width rule with a `.type-meta` uppercase kicker ("LATEST", "DISCUSSIONS", "LISTEN").

**Tier rhythm (NYT cadence):** Hero (1 lead span-8 + 2 features span-4) → Feature row (3× span-4) → labeled Section band → Brief river (span-3 lists). `WhoToFollow`/`OnThisDayCard` injected as span-4 modules between tiers.

**Algorithmic editor** — `useFeedLayout(posts)` computes a prominence score from signals already on each post, then greedily assigns slots:
```
recency    = exp(-hoursOld / 18)
engage     = log1p(likes + 2*comments + 3*reblogs)   // reblogs weighted highest
score      = engage * recency * (hasMedia?1.25:1) * (isEssay?1.2:1)
```
Slots: **LEAD** (top essay or landscape media — never a bare voice note), **FEATURE** (2–5, prefer media/essays, max 2 same-type in a row), **STANDARD** (body), **BRIEF** (low-score/short/quotes/bare reblogs). Guardrails: no author owns two of top 3; reblogs ×0.85 unless they add commentary; **sensitive posts never LEAD/FEATURE** (a blurred hero is a dead hero); slots assigned per-page-append so infinite scroll doesn't reshuffle rendered tiles.

**Per-type tiles** (`src/components/feed/frontpage/tiles/`, compact variants — NOT the full `Post` card whose header/action-bar chrome is wrong here):
- Essay → `LeadTile`/`FeatureTile`: Gloock headline, stripped standfirst, "Essay · N min read", extracted pull-quote.
- Photo/Gallery/Video → `MediaTile`: sized by aspect (reuse the `4/5 … 2/1` clamp), overlaid/under headline, click navigates (no inline lightbox).
- Quote → `PullQuoteTile`: the tile *is* the quote (`.type-quote`, oversized mark).
- Ask → `QnATile`: "Anonymous asked:" + question, 2-line answer.
- Audio → `ListenStrip`: art/title/waveform affordance, mic glyph + duration for voice, Spotify logo (no iframe in-grid).
- Poll → `PollModule`: the one fully-interactive tile (renders `<PollContent>` directly — vote without leaving).
- Reblog → original's tile type + "↻ echoed by" ribbon.

Each tile is one `<Link href="/post/{id}">` (or `/thread/{threadId}`); interactive children `stopPropagation`. The broadsheet is a **discovery surface**; the full post page stays the reading/interaction surface.

**Architecture:** `FrontPageGrid` (lazy via `next/dynamic` so Reader users don't pay for it) + pure `useFeedLayout` + `tiles/*` + `TileShell`. Toggle lives in `FeedClient` above the render branch; same `feedListPosts`, same infinite scroll. **Persistence:** new `profiles.feed_layout` (`reader|frontpage`, source of truth) + localStorage write-through for instant first paint (mirrors the `next-themes` + `blurSensitiveByDefault` patterns). Toggle UI = two-segment control in the `FeedTabs` row, hidden under `lg`.

### B. The public Front Page (root `/`) + visibility/privacy model

Today `/` is a dead redirect (logged-in→`/feed`, else→`/login`). The only existing public content is `/u/[username]` (+ archive), which already renders published posts to logged-out visitors and is **indexable by default** (no robots directives). So public exposure already exists — we're surfacing and governing it.

**Current visibility model:** the only gate is `posts.status = 'published'`. There is **no per-post or per-account public/private/discoverable column** (only `communities` have `visibility`). `is_sensitive` exists but is **not** excluded server-side from public surfaces today.

**Recommended model — public-by-default (opt-out), with a hard NSFW wall + granular controls.** Rationale: matches current reality (no regression), matches Tumblr-migrant expectations (blogs public+indexable by default), and keeps the front page populated. Mitigate the trust cost with clear disclosure + easy escape hatches.

New schema:
- `profiles.is_discoverable boolean default true` — master opt-out (off → excluded from `/`, from logged-out search/explore, and emits `noindex` on `/u`).
- `profiles.allow_search_indexing boolean default true` — feeds robots meta + sitemap only. **(Owner decision: this is the most defensible toggle to flip to default-off if you want to be conservative on SEO surprise — see §6.)**
- `posts.exclude_from_public boolean default false` — per-post override ("Hide from public web").

Public query (`getPublicFrontPagePosts`, admin client): `status='published' AND moderation_status='approved' AND is_sensitive=false AND exclude_from_public=false`, joined to `profiles.is_discoverable=true`, excluding `lock_status in (restricted,banned)`. **Always exclude sensitive from the public web regardless of viewer setting.**

User-facing settings (positive, clear wording — avoid the double-negative "don't use my posts"):
- Account → Privacy: **"Show my posts on the public be.vocl front page"** (default on), **"Allow search engines to index my blog"** (separate toggle).
- Composer/post menu: **"Hide from public web"** per post.

Plumbing: new `src/app/robots.ts` + `src/app/sitemap.ts`; `/u/[username]` + archive return `robots:{index:false}` when not indexable. **Fix the latent bug:** both `/u` queries filter `posts.is_deleted` (no such column) — change to `.eq("status","published")` / `.neq("status","deleted")`.

**Landing page:** rewrite `src/app/page.tsx` as a real public component — editorial hero with "Join be.vocl" (primary, pink) + "Log in" (secondary), a NYT-style grid of public posts (reuse the Front Page tiles, read-only — like/reblog routes anon users to `/signup`), section bands (Trending tags, Featured blogs, Recent), inter-band signup CTAs, full OG/Twitter metadata. Logged-in users still redirect to `/feed` (proxy already handles `/` allowlist).

### C. The editorial composer

The current composer is a 1,942-line monolith in a 576px modal — the writing surface is just one item in a stacked settings list, the editor caps at 200/400px, links use `window.prompt`, there are **no headings/blockquote/pull-quote**, and Edit is a *separate* 314-line modal that can't even change media. It feels cramped because writing is treated as a form field, not the main event.

**Redesign — a dedicated full-page route framed as a near-full-page modal** (`inset-4 md:inset-8`, `rounded-3xl`, subtle border + backdrop so the feed peeks at the margins; the FAB does `router.push("/create")`). Layout:
- **Thin editorial top bar:** pink wordmark + autosave status ("Draft saved · 2s ago") left; "Preview" toggle + primary publish split-button right.
- **Center "manuscript" column** (`max-w-[680px] mx-auto`, `py-12+`): title as an unboxed `.type-display-lg` Gloock input (NYT-style — a heading you type into, no field chrome); body in `.type-body-lg`. No card chrome — it's a page.
- **Collapsible right inspector** (~320px; bottom sheet on mobile): tags, community cross-post, publish mode (now/queue/schedule + time-capsule presets), sensitive, content-warning, alt-text, "Hide from public web". Everything that crowds the scroll today moves here.
- **Post type = a mode, not a stacked control:** slash-command + a small format switcher in the top bar.

**Rich-text upgrade** (`EditorialEditor` replacing `RichTextEditor`): TipTap with `Heading` (2–3), `Blockquote`, a custom **pull-quote** node (`.type-quote`), **BubbleMenu** (selection → bold/italic/link/H2/quote), **slash-command** menu, **inline link popover** (delete `window.prompt`), **drag-drop & paste image upload**, **live Preview** rendering the real post card. Per-type: media renders a full-bleed **hero block at the top of the column** with the editor below as a real caption (not an 80px afterthought).

**Autosave drafts:** `useComposerDraft` → localStorage (+ a `drafts` table), debounced, surfaced in the top bar — replaces the destructive `window.confirm` on close.

**Component breakdown (kills the monolith):** `EditorialComposer` (shell, used for create *and* edit) + `useComposerState` (one reducer for the ~40 fields + submit switch) + `ComposerTopBar`/`ManuscriptColumn`/`ComposerInspector` + `EditorialEditor`/`BubbleToolbar`/`SlashMenu`/`LinkPopover` + per-type heroes (`ImageHero`/`VideoHero`/`AudioHero`/`GifHero`/`PollEditor`, reusing existing `MediaUploader`/`VoiceRecorder`/`GifPicker`) + inspector panels. **Delete `EditPostModal`** — `EditorialComposer` takes `mode: create|edit` + `existingPost`.

### D. Voice-native features

Make voice an identity, not a gimmick. **Async only** (the lesson from Clubhouse/Airchat — live voice = too much attention cost). Three rules everywhere: **always auto-transcribe** (accessibility + moderation + skimmability + search), **never a black box** (waveform + duration before play), **text is always equal-status** (voice is an option, never required).

Build order by leverage:
1. **Audio Asks → Audio Answers** — a voice twist on Tumblr's signature feature. Highest identity value. (Asks infra + `allow_asks`/`allow_anonymous_asks` already exist.)
2. **Audio reactions** — leave a ~3s spoken reaction on a post. Nobody does this.
3. **Audio comments/notes** — already partially present (`CommentVoiceRecorder`); extend + transcribe + waveform.
4. **Audio DMs** — voice messages in chat (pairs with the messaging revamp, MSG-5).
5. **"Listen to this thread"** — play a thread's audio posts back-to-back like a mini-podcast.

Transcription: the `transcribePostAudio` action exists but is a **security hole** (no auth/IDOR — see `AUDIT-AND-REDESIGN-PLAN.md` SEC-4) — fix it as part of this track and reuse for all audio types.

---

## 3. Editorial recast of the existing surface work

The per-surface tickets in `AUDIT-AND-REDESIGN-PLAN.md` (Phase 3b/3c/3d) stand, now executed in the editorial language above:
- **Profiles** → a "masthead" identity: Gloock display name, tall hero banner, stat row, per-profile accent (Tumblr's signature, FND-5), pink Follow. Profile post lists can offer the same Reader/Front-Page toggle.
- **Messaging** → ✅ DONE (2026-06-21): two-pane desktop layout, real ISO timestamps + grouping + date dividers, reactions (`message_reactions` table + realtime), inline replies (`messages.reply_to_id`), voice notes (`media_type='audio'` + `media_duration`), motion, a11y (dialog/focus-trap/Esc/aria-live), Block/Report wired. ⚠️ Needs migration `20260621_messaging_features.sql` applied.
- **Chrome/notifications** → ⌘K command palette, grouped notifications, nav IA cleanup, the editorial composer (track C).
- **Foundation** → FND-1/2/4 shipped; **FND-3 (motion)** and **FND-5 (per-profile accent)** remain and unblock the above.

---

## 4. New ticket tracks (this document)

Effort: **S** <½d · **M** ½–1d · **L** 2–4d · **XL** 1–2wk

### Track E — Front Page broadsheet feed
| ID | Ticket | Effort |
|----|--------|--------|
| FP-1 | `useFeedLayout` — scoring + greedy slotting + tier packing (pure, tested) | M |
| FP-2 | Tile components + `TileShell` (Lead/Feature/Media/PullQuote/QnA/Listen/Poll/Brief) | XL |
| FP-3 | `FrontPageGrid` — tier/section rendering, hairline rules, section bands, module injection | L |
| FP-4 | Reader/Front-Page toggle in `FeedTabs` + `profiles.feed_layout` + localStorage write-through + `lg` gating | M |
| FP-5 | Lazy-load grid (`next/dynamic`); reuse infinite scroll; per-page-append slot stability | S |

**Status (2026-06-20):** ✅ FP-1 (`useFeedLayout` scoring/slotting), FP-2 (tiles: Article/Media/Audio/Poll via `FrontPageTile`), FP-3 (`FrontPageGrid` hero + river + hairline rules), FP-4 (Reader/Front-Page toggle, `lg`-gated, **localStorage** persistence), FP-5 (lazy `next/dynamic`, shared pipeline) shipped under `src/components/feed/frontpage/`. ⏳ Deferred: profile-column persistence (`profiles.feed_layout` — localStorage-only for now), interactive in-grid poll voting (links to post for v1), wide-screen breakout width is conservative (tune later), framer-motion (kept CSS-only).

### Track F — Public landing + visibility/privacy
| ID | Ticket | Effort |
|----|--------|--------|
| PUB-1 | Migration: `profiles.is_discoverable`, `profiles.allow_search_indexing`, `posts.exclude_from_public` | S |
| PUB-2 | `getPublicFrontPagePosts` (hard NSFW + discoverable + moderation/lock filters) | M |
| PUB-3 | Privacy settings UI (account toggles) + per-post "Hide from public web" | M |
| PUB-4 | Rewrite `/` as public editorial front page (hero, grid, sections, CTAs, OG) | L |
| PUB-5 | `robots.ts` + `sitemap.ts` + `/u` `noindex` wiring; **fix `posts.is_deleted` bug** in `/u` queries | S |

### Track G — Editorial composer
**Status (2026-06-20): ✅ done (build green).** Rebuilt into `src/components/Post/create/composer/` — `EditorialComposer` (full-page-as-modal, create+edit), `useComposerState` (posting logic ported line-for-line), `EditorialEditor` (TipTap: headings/blockquote/pull-quote, BubbleMenu, inline link popover, drag/paste upload), `ComposerTopBar`/`ManuscriptColumn`/`ComposerInspector`/`ComposerHero`, `useComposerDraft` autosave. `/create` + `/create?edit=<id>`; FAB routes to `/create`. Deleted `CreatePostModal` + `EditPostModal`. ⚠️ Omitted: slash menu (needs `@tiptap/suggestion` dep), "Hide from public web" toggle (needs `posts.exclude_from_public` from Track F). **Needs runtime smoke-test** (post each type, edit, schedule, community cross-post).

| ID | Ticket | Effort |
|----|--------|--------|
| COMP-1 | `useComposerState` reducer (consolidate ~40 fields + submit switch + validation) | L |
| COMP-2 | `EditorialComposer` shell — full-page-as-modal layout (top bar / manuscript / inspector) | L |
| COMP-3 | `EditorialEditor` — TipTap headings/blockquote/pull-quote + BubbleMenu + slash + link popover + drag/paste upload | XL |
| COMP-4 | Per-type hero blocks + inline caption; live Preview | L |
| COMP-5 | `useComposerDraft` autosave (localStorage + `drafts` table); kill `window.confirm` | M |
| COMP-6 | Unify Edit into `EditorialComposer` (`mode`/`existingPost`); delete `EditPostModal` | M |

### Track H — Voice-native
| ID | Ticket | Effort |
|----|--------|--------|
| VOX-0 | Fix + harden `transcribePostAudio` (SEC-4); shared transcribe+waveform util | M |
| VOX-1 | Audio Asks → Audio Answers | L |
| VOX-2 | Audio reactions on posts | L |
| VOX-3 | Audio comments/notes (extend `CommentVoiceRecorder`) + transcripts | M |
| VOX-4 | Audio DMs (with MSG-5) | M |
| VOX-5 | "Listen to this thread" sequential player | M |

### Bonus / "only-Be.Vocl"
The Daily Edition (auto-composed daily front page) · user-defined Sections/columns · datelines & bylines · auto pull-quotes from essays. Park until the four headline tracks land.

---

## 4b. Complete page coverage (every route)

The editorial system applies to **all 48 page routes**, not only the headline surfaces. Below, every route with its treatment, owning track, and priority tier. Tiers: **T1** identity-defining / public / high-traffic · **T2** core authed surface · **T3** functional/admin/legal (theming-only, not full editorial).

### Already in a headline/surface track
| Route | Treatment | Track | Tier |
|-------|-----------|-------|------|
| `/feed` | Reader/Front-Page toggle | E | T1 |
| `/` (root) | Public editorial front page | F (PUB-4) | T1 |
| `/u/[username]` (+ `/archive`) | Public masthead profile, indexable | F / 3b | T1 |
| `/profile/[username]` | Masthead identity; Reader/Front-Page on own posts | 3b + FP | T1 |
| `/create` | Editorial composer | G | T1 |
| `/notifications` | Grouped editorial notifications | 3d (CHR-4) | T2 |
| `/asks` | Editorial asks inbox + **audio asks** | H (VOX-1) | T2 |

### New track — Discovery & reading surfaces (Track I)
| ID | Route(s) | Editorial treatment | Tier |
|----|----------|---------------------|------|
| DISC-1 | `/explore` | The "Newsstand" — broadsheet discovery: section bands (trending tags, featured blogs, media walls), reuse Front-Page tiles. This is "browse". | T1 |
| DISC-2 | `/search` | Editorial results — sectioned by type (Posts / People / Tags), Gloock result headers, advanced filters kept | T1 |
| DISC-3 | `/tag/[name]` | A tag = a **newspaper section page**: section masthead, post count/follow, Reader/Front-Page grid of that tag | T1 |
| DISC-4 | `/post/[id]`, `/post/[id]/thread`, `/thread/[threadId]` | The **article/reading surface** — full editorial article page (Gloock headline, dateline/byline, reading time, pull-quotes, related-posts rail). This is what Front-Page tiles link into. | T1 |
| DISC-5 | `/on-this-day` | "From the Archives" editorial retrospective | T2 |
| DISC-6 | `/bookmarks` | "Your Clippings" — saved-posts editorial grid (Reader/Front-Page) | T2 |
| DISC-7 | `/activity` | Editorial activity log | T2 |

### New track — Composer-adjacent (folds into Track G)
| ID | Route(s) | Treatment | Tier |
|----|----------|-----------|------|
| COMP-7 | `/drafts` | Editorial drafts manager; opens into the new composer | T2 |
| COMP-8 | `/queue` | "Tomorrow's Edition" — editorial queue/calendar framing | T2 |

### New track — Communities = "Desks" (Track J)
| ID | Route(s) | Treatment | Tier |
|----|----------|-----------|------|
| COMM-1 | `/communities`, `/communities/new` | Community directory as editorial "desks/sections" index | T2 |
| COMM-2 | `/c/[slug]`, `/c/[slug]/about`, `/c/[slug]/settings` | Community page: section masthead + Reader/Front-Page feed; about/settings in editorial shell | T2 |

### New track — Settings, auth, system & legal (Track K)
| ID | Route(s) | Treatment | Tier |
|----|----------|-----------|------|
| SYS-1 | `/settings` + 8 sub-pages (`account, appearance, privacy, profile, notifications, password, security, invites`) + settings layout | Editorial settings shell (Gloock section heads, calm forms). `appearance` = theme + **feed-layout** + per-profile accent (FND-5); `privacy` = public-web toggles (PUB-3) | T2 |
| SYS-2 | `/login`, `/signup` | Editorial split-screen auth (masthead + live public-post column behind) | T1 |
| SYS-3 | `/onboarding` | Editorial interest-picker (the Tumblr-style first-run, polished) | T1 |
| SYS-4 | `/analytics` | Editorial dashboard (charts in brand palette) | T2 |
| SYS-5 | `/tips` | Editorial tips/monetization page | T2 |
| SYS-6 | `/privacy`, `/terms` | Pure editorial typography — easy, very "newspaper" win | T3 |
| SYS-7 | `/account-status` | Minimal themed status page (banned/restricted) | T3 |
| SYS-8 | `/embed/[id]` | Editorial embeddable post card | T3 |
| SYS-9 | `/admin` + 7 sub-pages (`appeals, email, flags, invites, reports, users`) + admin layout | **Theming/token refresh only** (inherit light/dark + tokens) — functional, internal, not full editorial. | T3 |
| — | `/demo` | Dev/demo route — audit & likely remove | T3 |

### Non-UI (no editorial work, noted for completeness)
`api/**` route handlers · `auth/callback` · `rss/**` (note: `rss/podcast/[username]/[threadId]` already supports the **voice/podcast identity** — keep & feature). Security/perf fixes for these live in `AUDIT-AND-REDESIGN-PLAN.md`.

---

## 5. Sequencing

1. **Finish foundation:** FND-3 (motion), FND-5 (per-profile accent). Unblocks everything visual.
2. **Front Page (Track E)** — the highest-differentiation, highest-risk idea. Prototype FP-1/FP-2 against real post types first; seeing it real validates the whole editorial direction.
3. **In parallel: Editorial composer (Track G)** — independent surface, immediate quality win, owner pain point.
4. **Public landing + privacy (Track F)** — needs the Front Page tiles (FP-2) to exist; ship after E is stable. **Resolve the §6 privacy default before PUB-1.**
5. **Discovery & reading surfaces (Track I)** — once Front-Page tiles exist, `explore`/`search`/`tag` reuse them cheaply; the **article/reading page (DISC-4)** is high-value and should land alongside the Front Page (tiles link into it). `/login`/`/signup`/`/onboarding` (SYS-2/3) ride with the public landing (Track F) since they share the public editorial shell.
6. **Voice (Track H)** — layer on once layout + composer are stable; VOX-0 can ride along with the security phase.
7. **Remaining surfaces — ongoing:** profiles/messaging/chrome (companion plan 3b/3c/3d), communities (Track J), settings/system/legal (Track K). Admin (SYS-9) gets only a token/theme refresh. `/demo` audited for removal.

> Security Phase 0 from `AUDIT-AND-REDESIGN-PLAN.md` still precedes all of this if there's a live instance — esp. SEC-1/2/3 and SEC-4 (which Track H depends on anyway).

---

## 6. Open decisions for the owner
1. **Search-engine indexing default** — front-page visibility opt-out is settled (public by default). But should `allow_search_indexing` default **on** (max reach, matches Tumblr) or **off** (conservative; users opt into being Google-indexed)? Recommendation: **on**, with prominent onboarding disclosure — but this is the one most worth a deliberate call.
2. **Two layouts = two layouts to maintain forever.** Reader + Front Page is real ongoing cost. Worth it for differentiation — go in eyes-open.
3. **Composer as full route vs modal-route** — recommended full-page-framed-as-modal; confirm you're happy losing the lightweight quick-post feel (mitigate with a future "quick note" mini-composer if needed).
4. **Voice scope for v1** — all of Track H, or start with Audio Asks (VOX-1) as the flagship and expand?
