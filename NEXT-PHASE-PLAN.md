# Be.Vocl — Next-Phase Plan

> Closes the remaining Tumblr gaps, introduces Communities + a unified Browse hub, and adds differentiating features that lean into Be.Vocl's identity (voice / vocal / niche-community-first).
>
> **Status:** Proposal — not yet scheduled.
> **Sequencing:** Three phases. Each phase is independently shippable.

---

## 1. Strategic Positioning

Be.Vocl is already past the "Tumblr clone" stage on several axes (semantic For You, polls, post threads, Spotify, bookmark collections, analytics, calendar queue, Paddle tips, escalation-aware moderation). The remaining work is in two buckets:

1. **Parity** — table-stakes Tumblr features users *expect* (OAuth, RSS, embeds, mutuals, search filters, trending posts, theme expression).
2. **Differentiation** — features that give Be.Vocl an identity Tumblr can't easily copy.

The brand name suggests an angle nobody else owns: **vocal / voice / spoken-word-first social blogging**. The plan below leans into that.

---

## 2. The New Browse Hub

Replaces the standalone `/search` page with a single multi-purpose discovery surface at `/browse`.

### Layout (mobile-first)

```
/browse
├─ [Hero: Founder's Blog card]      ← your own pinned content
├─ [Search bar — sticky]
├─ Tabs: For You · Communities · Tags · People · Posts
└─ [Tab content]
```

### Tabs

| Tab | Content |
|---|---|
| **For You** | Trending posts (24h velocity), rising creators, recommended communities, recommended tags. Personalized when logged in. |
| **Communities** | Browse + search communities. Featured, new, joined. |
| **Tags** | Trending tags, tags you follow, tag search. |
| **People** | Suggested follows (mutuals-of-mutuals, similar interests), creator search. |
| **Posts** | Full-text + filtered post search (type, date, tag, has-media). |

### Founder's Blog Hero

A pinned card on `/browse` reserved for **your** posts (admin role 5+ slot). One of:
- **Single mode** — one curated post (latest "blog" post).
- **Carousel mode** — last 3 long-form posts.
- **Custom mode** — handwritten HTML/markdown panel that links anywhere.

Implementation: new `featured_blog_slot` table with `(slot_key, post_id?, custom_html?, active)` rows, admin UI under `/admin/featured`.

### Why a hub instead of separate pages
- Reduces nav clutter (currently: Search, Explore, Tag pages all separate).
- Gives communities a natural home without inventing yet another top-level route.
- Surfaces your editorial voice as the platform owner without it feeling like an ad.

### Migration
- `/explore` → redirect to `/browse?tab=for-you`
- `/search` → redirect to `/browse?tab=posts&q=…`
- Tag pages stay (deep-link friendly), linked from `/browse?tab=tags`.

---

## 3. Communities

The single biggest feature add. Tumblr's recent "Communities" launch validates the demand; we can do it better by integrating it with what we already have (semantic For You, post threads, polls, asks).

### Concept
A community is a **shared tag-space + membership + optional moderators**. Posts can be cross-posted to a community (post stays on author's profile *and* appears in the community feed). This avoids the "subreddit silo" problem.

### Core entities

```sql
communities (
  id uuid pk,
  slug text unique,            -- /c/photography
  name text,
  description text,
  banner_url text,
  icon_url text,
  visibility enum('public','restricted','private'),
  join_policy enum('open','request','invite_only'),
  nsfw boolean,
  created_by uuid → profiles,
  created_at timestamptz
)

community_members (
  community_id, user_id,
  role enum('member','moderator','owner'),
  joined_at timestamptz,
  primary key (community_id, user_id)
)

community_posts (
  community_id, post_id,
  added_by uuid,               -- author or mod (cross-post)
  pinned boolean,
  added_at timestamptz,
  primary key (community_id, post_id)
)

community_rules ( community_id, position int, title, body )
community_tags  ( community_id, tag )   -- canonical tags
```

### Routes
- `/c/[slug]` — community feed
- `/c/[slug]/about` — rules, mods, member count
- `/c/[slug]/members`
- `/c/[slug]/settings` (mods/owners only)
- `/browse?tab=communities` — directory

### Posting flow changes
- `CreatePostModal` gets a "Post to…" selector: your profile (default) + any communities you've joined. Multi-select allowed.
- Cross-posted post shows a small `posted in c/photography` badge in the feed.

### Moderation
- Reuses the existing report/flag/escalation system, scoped to community.
- Mods can remove a post from their community (deletes the `community_posts` row, doesn't touch the original).
- Site admins can override.

### "For You" integration
- Joined communities feed into the semantic interest pool — posts from communities you're in are weighted similarly to followed users.
- `community_members` gives a clean signal for community recommendations.

### Phase split
- **MVP**: public communities, open join, member feed, basic mod tools (remove post, ban from community).
- **V2**: request/invite policies, rules section, pinned posts, community asks (anon questions to mods), community-wide content warnings.

---

## 4. Tumblr Gap Closures

Prioritized by effort vs. user impact. "Effort" is rough engineering days.

### Tier A — Ship first (parity must-haves)

| # | Feature | Effort | Notes |
|---|---|---|---|
| 1 | **OAuth login** (Google, Apple) | 1d | Supabase has the providers wired; just enable + add buttons + handle profile creation collision. |
| 2 | **Mutuals indicator** | 1d | Add `is_mutual` boolean to follow queries; show a small badge on profile + in WhoToFollow. |
| 3 | **Trending posts feed** | 2d | Velocity formula: `likes + comments*2.5 + reblogs*4` over 24h, decay over 48h. New tab in `/browse`. |
| 4 | **Advanced search filters** | 2d | Type (text/image/video/audio/poll), date range, has-media, in-community. Already have full-text. |
| 5 | **Mute users — wire into feed** | 0.5d | DB exists, just filter at query time. |
| 6 | **Content warning display** | 1d | The input exists; add overlay component (similar to NSFW) and reveal-on-tap. |
| 7 | **Pause/resume queue UI** | 0.5d | DB column exists; one toggle in queue settings. |

### Tier B — Ship second (rounds out parity)

| # | Feature | Effort | Notes |
|---|---|---|---|
| 8 | **RSS / Atom feeds** | 1d | `/u/[username]/rss.xml`, `/c/[slug]/rss.xml`, `/tag/[name]/rss.xml`. Use Next.js route handlers. |
| 9 | **Embeddable posts** | 2d | `/embed/[postId]` route returning a stripped iframe-friendly view + JS snippet generator on Share menu. |
| 10 | **Activity filtering** | 0.5d | Tabs in `/activity` for likes / comments / reblogs / follows. |
| 11 | **Archive view** | 1d | `/u/[username]/archive` — month grid with thumbnails. Useful for long-tail blogs. |
| 12 | **Sent-tip history** | 0.5d | Mirror of received-tips list, query already supports it. |
| 13 | **Keyboard shortcuts** | 1d | J/K post nav, L like, R reblog, B bookmark, / focus search, ? cheat sheet modal. |
| 14 | **Account deletion UX polish** | 1d | Multi-step confirm, anonymize vs. hard-delete choice surfaced clearly. |

### Tier C — Defer (low ROI or high cost for current stage)

- **Custom domains** — needs DNS provisioning + cert orchestration; revisit at scale.
- **Theme / blog customization** — the cultural moment for Tumblr-style theming has passed; modern users expect a consistent, polished UI more than per-blog HTML. Skipping entirely.
- **Quote / Link / Chat post types** — modeled fine inside text + link previews; don't add post-type sprawl unless data shows demand.
- **Native reblog attribution inline** — current chain view is cleaner; instrument before changing.

---

## 5. Standout Features (Be.Vocl-original)

These are the features I'd push hardest on to give Be.Vocl an identity that doesn't read as "Tumblr but newer."

### 5.1 Voice-first features (lean into the brand)
- **Voice notes / spoken posts** — record audio in-browser (already have audio post type), waveform display, auto-transcribed via Whisper for accessibility + search indexing.
- **Voice replies on comments** — short voice-note comments alongside text.
- **Podcast-style series** — bind audio post threads into a feed with chapter markers; surfaces as an RSS podcast feed (Apple/Spotify-compatible).

### 5.2 Long-form / essay mode
- **Essay editor** — distraction-free writing surface, headings/quotes/footnotes, reading-time estimate, "publish as essay" promotes the post on `/browse`.
- **Reading time + reader view** — strips chrome on mobile for long posts.

### 5.3 Collaboration
- **Co-authored posts** — multi-author attribution, shared edit access, both authors' followers see it.
- **Shared bookmark collections** — invite collaborators to a collection (zine-style curation).

### 5.4 Time & memory
- **Time-capsule posts** — schedule a post for 6 months / 1 year / on-this-day.
- **On This Day** — daily widget on `/browse` showing your posts from previous years (Tumblr lacks this; TimeHop-style stickiness).

### 5.5 Newsletter / digest
- **Subscriber digest** — followers can opt into a weekly email of your posts (you toggle availability per-post or per-account). Powered by the existing digest cron.
- **Per-creator RSS + email** — same source of truth.

### 5.6 Curation & community
- **Community spotlights** — mods pick "post of the week" for `/c/[slug]`; surfaces in `/browse` Communities tab.
- **Public reading lists** — bookmark collections that can be made public + followed by others.
- **Annotations** — highlight + comment on a span of someone's text post (visible to mutuals only by default). Powerful for essay culture.

### 5.7 AI helpers (opt-in, not pushy)
- **Auto alt-text** for images (Vision API, user-editable).
- **Suggested content warnings** based on detected topics (suggest only; never auto-apply).
- **Tag suggestions** while composing (uses existing semantic tag matcher in reverse).

### 5.8 ActivityPub / Fediverse bridge
- Federate public posts so they're followable from Mastodon/Pixelfed. Tumblr is reportedly doing this; shipping it well is a credibility signal for the indie-web crowd.
- Costs: significant — defer to Phase 3, but architect the post model so it isn't blocked later.

### 5.9 Niche-finder
- **"Find your people"** — a periodic prompt that nudges users toward 2–3 communities or creators based on tag activity. Counter to the doomscroll algorithm — designed to convert lurkers into participants.

---

## 6. Phased Rollout

### Phase 1 — Browse + Parity Tier A (≈3 weeks)
1. Build `/browse` shell with tabs.
2. Founder's Blog hero + admin UI.
3. OAuth, mutuals, trending posts, advanced search, mute-feed wiring, content warning overlay, queue pause toggle.
4. Redirect old `/explore` and `/search` routes.

**Outcome:** Discovery surface modernized, all "expected Tumblr features" present.

### Phase 2 — Communities + Tier B (≈4 weeks)
1. Communities MVP (public, open-join, basic mod tools).
2. Cross-post flow in CreatePostModal.
3. Communities tab on `/browse`.
4. RSS, embeds, archive, activity filters, keyboard shortcuts, sent-tip history, deletion UX.

**Outcome:** Be.Vocl is at parity + has the one big structural feature (communities) that creates network density.

### Phase 3 — Differentiation (≈6 weeks, modular)
Pick 2–3 of the 5.x sections per sprint. My recommended ordering:
1. **Voice-first features** (brand fit, audio infra already exists).
2. **Essay editor + reader view** (anchors long-form audience).
3. **On This Day + time-capsule** (cheap, sticky).
4. **Annotations + public reading lists** (community curation).
5. **AI helpers** (low-friction quality wins).
6. **Subscriber digest** (creator monetization adjacent).
7. **ActivityPub bridge** (last — biggest cost, biggest credibility).

---

## 7. Open Questions

- **Communities vs. tags** — is a community really different from a followed tag with members? My take: yes, because membership + moderation create accountability; tags can't be moderated. Worth validating with 5 users before building.
- **Founder's Blog placement** — hero on `/browse` is prominent. Feels editorial, but could read as self-promotion. Consider an "About" link instead of a hero card if it tests poorly.
- **AI features cost** — Whisper transcription + Vision alt-text have non-trivial unit economics. Free for early users, gate behind a "creator tier" once we have one.

---

## 8. What I'd Cut

To keep the plan honest:

- **Custom domains** — Tumblr-style vanity domains. Real cost (DNS automation, certs), no clear lift to engagement at our stage. Defer indefinitely.
- **Quote / Link / Chat post types** — adds enum sprawl. Existing text + link preview handles 95%.
- **Dashboard filtering** — solving with `/browse` tabs is cleaner than adding filter chips to the main feed.

---

## 9. Success Metrics (per phase)

- **Phase 1**: 60% of weekly actives use `/browse` at least once; search-to-result-click rate up 20%.
- **Phase 2**: 25% of weekly actives join ≥1 community in first month post-launch; cross-post adoption ≥10% of new posts.
- **Phase 3 (voice)**: 5% of posts include audio within 60 days of voice-note launch.
- **Phase 3 (essay)**: avg session length on essay posts ≥2× baseline.

---

*Next step:* sanity-check with 3–5 active users, then break Phase 1 into tickets.
