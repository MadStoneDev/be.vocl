# Be.Vocl — Friends-Beta Readiness Audit

_Generated 2026-07-09. Method: `tsc`/`eslint` (both clean, exit 0) + five parallel code audits (auth · feed/posts/composer · messaging/notifications · profiles/settings/communities · infra/deploy/moderation) + direct diagnosis of 5 hands-on bugs reported by Richard._

## Fixes applied (2026-07-09, same day)

Code-level items below are **done** (typecheck + lint clean). Ops items remain the owner's.

- **Auth:** magic link now passes `shouldCreateUser:false` — unknown emails can no longer self-provision (invite wall holds).
- **Explore:** fixed the `post_tags.created_at` query (joined to `posts.created_at`) — page loads again.
- **Editing (your bug #4 + more):** profile now passes `content` to `InteractivePost` (own posts editable); `getPostById` lets an owner load their own non-published posts (scheduled/queued editable); gallery edits hydrate from `urls` (no more image loss); `PollContent` options guarded against crash.
- **Post page (#3):** owner Edit/Delete controls added to the byline.
- **Front Page (#1, #5):** author is now a profile link; own posts get an Edit link.
- **Profile width (#2):** `max-w-2xl` → `max-w-3xl`.
- **Drafts hazard:** reframed as "Under review", removed the false save-as-draft promise, and `publishDraft` now refuses to self-publish moderation-flagged content.
- **Notifications:** follow → profile link; message → opens chat (were dead before). **Conversation list** now sorts by recency.
- **Settings:** appearance theme selector uses `next-themes` (persists); privacy Blocked/Muted lists load (new `getBlockedUsers`/`getMutedUsers`); password change verifies the current password; account deletion uses the service-role client so the auth email is actually anonymized.
- **Communities:** Discover join no longer fakes "Joined" for request/invite-only communities (shows "Request sent").
- **Onboarding:** gate now reads `onboarding_completed`, so the wizard actually runs. ⚠️ Existing accounts (incl. your test ones) will be routed through onboarding once — set `onboarding_completed = true` in the DB for them if you want to skip it.

**Still the owner's to do (dashboards, not code):** verify Resend key + from-domain, confirm Vercel Pro, seed an admin (SQL below), disable open signups in Supabase Auth.

---

## Bottom line

**Conditional GO for a small, _trusted_ friends beta** — after a short must-fix list. This is a genuinely mature app (v0.5.0): the create→publish→feed→render loop, real-time DM, follow graph, communities, queue/scheduling, moderation/admin, email, and legal pages all actually work. Typecheck and lint are clean.

**Two caveats that make it "trusted friends only," not "public-ish":**
1. The "private" beta **is not actually gated** — invite checks are client-side and the magic-link button self-provisions accounts. Anyone with the URL can sign up.
2. Content is essentially **unmoderated** — no text moderation anywhere; image moderation is fail-open and only screens CSAM/extreme-gore.

Both are fine for people you know and trust. Neither is fine for anything that could leak beyond them.

---

## Richard's 5 hands-on bugs — diagnosed

| # | Finding | Root cause | Severity |
|---|---------|-----------|----------|
| 1 | Front Page: own posts have no edit/menu | Tile view (`FrontPageTiles.tsx`) renders only a link + comment/voice icons — **no `PostMenu` at all** in tiles | Gap (by omission) |
| 2 | Profile too narrow | Hard-capped at `max-w-2xl` (672px) throughout `profile/[username]/page.tsx` | Design choice |
| 3 | Post page: no menu/edit | Menu button always renders (`Post.tsx:269`) and `PostPageClient.tsx:335` wires `isOwn` — so it should show. If it doesn't, it's the same `currentContent` gate as #4 for that post's type | Bug (see #4) |
| 4 | Profile: menu shows but "Unable to edit" | Edit is gated on `currentContent` truthiness (`InteractivePost.tsx:451` & `:701`). Posts whose `content` prop is null/empty (image/gallery/poll/audio paths) hit the misleading toast. **Compounded by:** `getPostById` filters `status='published'` (`posts.ts:594`) so scheduled/queued/draft posts can't be edited at all, and gallery edits load from the wrong field (`items` vs stored `urls`) and lose images | **Real bug (3 layers)** |
| 5 | Front Page: no author hyperlink | Author is a plain `<span>` (`FrontPageTiles.tsx:132`), not a `Link` | Gap |

**Theme:** #1, #4, #5 all point the same way — the Front Page/tile view and the edit path were built for _reading_, not for _managing your own content_. That's a tester's very first instinct, so it reads as broken even though the underlying data is fine.

---

## What's genuinely good (keep, don't touch)

- **Composer rebuild is done and clean.** Old 1,940-line `CreatePostModal` is deleted — no half-migration, no two composers. `EditorialComposer` is the single live one; every creatable type (text/story, image, gallery, video, audio/voice+transcribe, poll, GIF) works with thorough validation.
- **Feed loads without layout-shift or blank-screen** for brand-new zero-follow users; friendly empty states across feed/tag/thread/explore/bookmarks/asks.
- **Real-time DM works end-to-end** — optimistic send, dedup on echo, read receipts both ways, typing indicators. All three June-flagged chat bugs are genuinely fixed. Block & Report are fully implemented (not stubs).
- **Follow graph is real and consumed** by feed + recommendations. Follow/unfollow guards self-follow, blocks, dupes; counts via DB triggers.
- **Communities** create/join/leave/post all wired; June's `community_members` RLS recursion is fixed.
- **Search** is functional and injection-hardened; respects searchable/sensitive gating.
- **Queue & scheduling work end-to-end** via real Vercel crons, fail-closed on `CRON_SECRET`.
- **Moderation/admin is real** — admins can review reports/flags/appeals and ban/restrict/unlock, all server-side `requireRole()`-gated with audit logging.
- **Security posture is solid** — full CSP/security headers, SSRF guards on image proxy, presign size bound into signature, Paddle+email webhooks HMAC timing-safe. No secrets committed (`.env.local` never tracked).
- **Legal + email are real** — substantive privacy/terms pages, 17 React-Email templates.
- Reblog/echo is denormalized (snapshotted), so no infinite-nesting or deleted-original crashes.

---

## MUST FIX before you invite anyone

### Gating & delivery (the "is it actually private / will they get in" set)
1. **Close the signup bypass.** `handleMagicLink` (`AuthCard.tsx:264`) calls `signInWithOtp` without `shouldCreateUser:false` → anyone can self-provision. Also flip the Supabase project "allow new signups" toggle off and rely on invite redemption. Invite check is currently client-only (`AuthCard.tsx:215`) and its failure is only `console.error`'d — the account is created regardless.
2. **Verify email actually sends.** If `RESEND_API_KEY` is unset, magic-link/reset/welcome/**digest** all mock-return success and send nothing — and the digest route then _deletes_ the pending notifications. Confirm the key **and** that the from-domain (`noreply@be.vocl.app`) matches the verified Resend domain, or every auth email silently fails and no friend gets in.
3. **Seed an admin.** `profiles.role` defaults to 0; nothing bootstraps an admin. Until you manually `UPDATE` one account to role ≥ 10, the entire `/admin` surface is locked and reports pile up unseen.
4. **Confirm Vercel Pro.** `vercel.json` uses `*/5` and `*/15` crons; Hobby runs cron once/day, so scheduled/queued posts would silently never publish.

### Broken surfaces
5. **Explore page is fully dead.** `explore.ts:123` filters `post_tags` on a non-existent `created_at` column → 400 → the whole `Promise.all` rejects → error, zero data. One-line fix (drop the filter or join to `posts.published_at`), but it's a primary discovery surface.
6. **Drafts page advertises a feature that doesn't exist.** There is no "save as draft" (composer only does now/queue/schedule; "Draft saved" is localStorage-only), yet `/drafts` promises DB drafts. Worse, editing _any_ non-published post is broken (#4's `getPostById` filter), and `publishDraft` lets an owner republish moderation-flagged content with no re-check. **Hide the nav entry** and fix `publishDraft` before beta.
7. **Fix the edit gate (#4).** Loosen the `currentContent` guard so image/gallery/poll/audio own-posts are editable; let `getPostById` (or a sibling) load the owner's own non-published posts; hydrate gallery edits from `urls`.
8. **Guard `PollContent.tsx:116`** — `content.options.map()` is unguarded; a malformed/legacy poll row crashes the card. (`(content.options ?? [])`.)

### Front Page management affordances (#1, #5)
9. Add the author `Link` and a `PostMenu` (at least edit/delete for `isOwn`) to Front Page tiles, or accept that the tile view is read-only and make Reader the default while testing.

---

## Needs work (rough, not blocking)

- **Message & follow notifications aren't clickable** — `getNotifications` drops `message_id`/actor link, so "X sent you a message" / "X followed you" are dead divs. First things a tester clicks.
- **Conversation list isn't sorted by recency** (comparator returns 0 when both have messages) — looks broken past 2 threads.
- **Appearance theme selector is disconnected** from next-themes (writes a private localStorage key that gets overridden on reload) — theme choice doesn't stick. Font-size / reduced-motion / second accent toggles are dead too.
- **Privacy Blocked/Muted lists never load** — always show "you haven't blocked/muted anyone."
- **Communities Discover join button** falsely shows "Joined" for request/invite communities.
- **Password change doesn't verify current password**; **account deletion** leaves `auth.users` email intact and swallows the error.
- Feed pagination is pure offset → boundary-row dup on mid-scroll insert (cosmetic at this scale).
- Poll/ask posts render a **blank body** in thread/tag/bookmark feeds (permalink is fine).
- Two divergent profile pages (`/profile/[username]` canonical vs `/u/[username]` SEO) still not unified; `via.placeholder.com` fallbacks remain on `/u` and search.
- Onboarding wizard is **dead code** — `checkOnboardingStatus` gates on `display_name` (always set at signup) instead of `onboarding_completed`, so it always redirects to feed. Not a blocker (friends land fine), but the whole avatar/bio/interests flow never runs.
- Appeal decisions never notify the user (both directions silent).

---

## Gaps / missing for a beta

- **Content safety is thin** — no text moderation at all; Sightengine runs on post-create only, is fail-open (unset keys or any error → pass), and blocks only CSAM + extreme gore. Fine for trusted friends; wire the keys anyway.
- No community search; no `following_count` counter; follow graph is world-readable (ignores show-followers/following privacy toggles).
- Mobile create affordance is thin (FAB is `hidden sm:flex`) — confirm the bottom nav routes to `/create` on phones.
- README is still create-next-app boilerplate; no real setup/deploy doc for you.

---

## Suggested sequence to "invite-ready"

1. **Ops (½ day):** env set (Supabase, R2 incl. `R2_PUBLIC_URL`, Resend + verify domain, `CRON_SECRET`, Sightengine), confirm Vercel Pro, seed an admin, close signups + `shouldCreateUser:false`. Send yourself a magic link and a password signup end-to-end.
2. **Broken-surface fixes (1 day):** Explore `created_at`, hide Drafts + fix `publishDraft`, edit-gate (#4), PollContent guard, Front Page author link + menu (#1/#5), widen profile (#2).
3. **First-impression polish (½ day):** clickable message/follow notifications, conversation sort, theme selector wiring.
4. _Then invite._ Everything in "Needs work"/"Gaps" beyond that is safe to fix live with a forgiving audience.
