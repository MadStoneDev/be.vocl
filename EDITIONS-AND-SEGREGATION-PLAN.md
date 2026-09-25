# Editions, be.vocl Plus & the SFW/Adult Segregation Plan

_Last updated: 2026-09-25_

> **STATUS (2026-09-25): Paywall DISABLED — all 33 editions are free.** The owner
> chose to ship everything free for now rather than take on payment-processor risk
> while the content line is undecided. The paywall is switched off behind a single
> flag, `EDITIONS_PAYWALL_ENABLED` in `src/editions/registry.ts` (currently
> `false`). All the machinery below (entitlements table, resolveEdition gating,
> the Paddle subscription webhook, PlusUpgradeSheet, the PLUS tags) stays in place
> but dormant; flip the flag to `true` (and configure a processor) to re-enable.
> Nothing was deleted, so this is fully reversible.

This document captures (1) the **strategy** for monetising themes while allowing
legal adult content, (2) **what was built** in this pass, and (3) the **punch
list** of what remains. It is the reference for the hybrid/segregated approach
the owner chose.

> **Not legal advice.** The segregation model below touches 18 U.S.C. §2257
> criminal record-keeping, card-network rules and funds-holding risk. Before
> registering entities, signing a processor, or launching adult content, have a
> payments / adult-industry attorney review this plan.

---

## 1. The decision: hybrid / segregated

The paywall processor choice and "allow adult content" are in direct conflict on
a **single** platform, because processors judge the whole business, not the
individual charge:

| Processor (current: **Paddle**) | Adult content | Model |
|---|---|---|
| Paddle, Stripe, PayPal/Braintree, Lemon Squeezy | ❌ Prohibited | PSP / Merchant-of-Record |
| CCBill, Segpay, Verotel/Vendo, Epoch, RocketGate | ✅ Built for it | High-risk PSPs |

Selling a *theme* is harmless digital goods; what freezes a Paddle account is
Paddle **discovering the platform hosts sexual content at all**.

### The model we're building toward — "two doors"

- **BeVocl (main)** = strictly SFW. No sexual content. **Paddle** bills
  everything here (Plus themes, tips, verification). Paddle never touches adult
  content or adult revenue, so it stays clean.
- **A separate adult product** (own brand/subdomain, **own legal entity, own
  bank account, own T&Cs + privacy policy, own age/ID wall, own §2257 records**)
  billed through an adult PSP. Sexual content lives **only** here.
- Shared **code + design system** is fine. Shared **money flow / merchant of
  record** is not.

### The trap to avoid

One BeVocl where sexual posts are allowed but themes bill on Paddle and adult
subs bill on CCBill. Paddle is still the processor for users of a platform that
hosts porn → **transaction laundering** in their eyes → termination + frozen
balance. Do not do this.

### What "real separation" requires

- Separate legal entities with separate bank accounts (not just separate
  products under one company).
- Full disclosure of the true business to each processor (concealment = fraud).
- The adult entity owns the **entire compliance stack**:
  - Age + identity verification of every person **depicted** (not just the
    uploader), with documented consent — post-2021 Visa/Mastercard requirement.
  - 18 U.S.C. §2257 record-keeping (US).
  - Human moderation + fast takedown, CSAM hashing, **NCMEC reporting**.
  - The SightEngine AI checker is **one input, not the whole thing.**
- Adult PSP economics: ~10–15% fees, rolling reserves, chargeback scrutiny.
- Distribution: adult product is **web-first** (Apple/Google restrict adult apps).

### Sequencing

Ship the SFW BeVocl (with the Plus theme paywall on Paddle) now; keep the
platform SFW at launch. Stand up the separate adult entity/processor/compliance
as its own project when there's demand and budget — don't block launch on it.
**The code built now is processor-agnostic and has a clean adult seam so neither
decision is blocked later.**

---

## 2. What was built in this pass

### 2a. Editions (user-selectable themes)

"Editions" are token-only themes — colours, fonts, rules, texture change; layout
never does. 33 editions (9 free / 24 Plus).

| Area | File(s) |
|---|---|
| Source of truth (tokens) | `src/editions/editions.json` (from the design handoff; 2 colours nudged for AA — see §4) |
| Typed registry + helpers | `src/editions/types.ts`, `src/editions/registry.ts` |
| CI validator (contrast + tiers + structure) | `scripts/validate-editions.mjs` (`npm run validate:editions`) |
| Generated CSS (`[data-edition]` blocks) | `scripts/generate-editions-css.mjs` → `src/app/editions.generated.css` (`npm run gen:editions`) |
| Token plumbing (font indirection + new tokens) | `src/app/globals.css` |
| On-demand Google-font loader | `src/editions/fonts.ts` |
| Reading-edition client + anti-flash boot | `src/editions/client.ts`, wired in `src/app/layout.tsx` |
| Profile-scoped edition | `src/components/profile/ProfileAccentScope.tsx` (now carries `data-edition`) |
| Picker UI (reading + profile sections) | `src/components/settings/EditionsSettings.tsx`, dropped into `src/app/(main)/settings/appearance/page.tsx` |

**How re-skinning works:** the app already themes through CSS vars (`--paper`,
`--ink`, `--meta`, `--rule`, `--accent`, …). Editions redefine those on a
`[data-edition="x"]` scope, so every `bg-paper` / `text-ink` / `text-accent`
utility re-skins with no markup change. Fonts are indirected through
edition-owned vars (`--font-headline/body/ui/slug`) because Tailwind's
`@theme inline` inlines the mapped value — the utilities now resolve through
those vars, which an edition overrides (the next/font `<body>` vars couldn't be).

The generated CSS is imported **after** `globals.css` in the layout so an active
edition wins over the base `:root`/`.dark` tokens on equal specificity.
`prebuild` runs the validator + generator.

### 2b. be.vocl Plus (processor-agnostic paywall)

| Area | File(s) |
|---|---|
| Entitlements table (generic, not a profiles boolean) | `supabase/migrations/20260925_plus_entitlements.sql` |
| Edition preference columns on `profiles` | same migration |
| Entitlement check (+ 14-day grace) | `src/lib/entitlements.ts` |
| Pure edition resolution (Plus gate + fallbacks) | `src/editions/resolve.ts` |
| Server actions (read/apply, 402-style `plusRequired`) | `src/actions/editions.ts` |
| Paddle subscription webhook → grant/revoke | `src/app/api/webhooks/paddle/route.ts` |
| Upgrade sheet (opens Paddle checkout) | `src/components/payments/PlusUpgradeSheet.tsx` |
| Generated DB types | `database.types.ts` (`entitlements`, new profile cols, `posts.is_adult`) |

**Processor-agnostic by design:** entitlement is a row in `entitlements`
(`product='plus'`, `status`, `expires_at`), **not** a boolean on `profiles`. The
Paddle webhook grants it today via a **service-role** client (`createAdminClient`,
RLS blocks everyone else); a different PSP (the adult product's) can grant the
same entitlement later with no schema change. `resolveEdition` is the single
place that decides which edition renders — clients never decide tiers.

Never-paywalled regardless of tier (asserted in the validator):
`clear-print` (accessibility), `quiet-room` (wellbeing), `pride-print` (identity).

### 2c. Adult-content wall (the segregation seam)

`is_adult` is a **stricter sibling** of the existing `is_sensitive` flag.

| Area | File(s) |
|---|---|
| `posts.is_adult` + trigger (implies sensitive, never public) + index | `supabase/migrations/20260925_adult_content_wall.sql` |
| Composer state / persistence | `src/components/Post/create/composer/useComposerState.ts` |
| Composer "Adult · 21+" toggle | `src/components/Post/create/composer/ComposerInspector.tsx` |
| Edit-mode hydration (+ sticky server guard) | `EditorialComposer.tsx`, `src/actions/posts.ts` |
| Create/update write the flag | `src/actions/posts.ts` |
| **Feed hard gate** | `src/actions/posts.ts` `getFeedPosts` — `.eq("is_adult", false)` |

**Behaviour:** at launch the standard SFW feed hard-excludes `is_adult` for
everyone (SFW-at-launch). Adult content is cleanly identifiable and separable —
when the adult product is built, that surface opens the gate for verified-21+,
opted-in viewers. The DB trigger enforces "adult ⇒ sensitive" and "adult is
never public" as defense in depth. `updatePost` treats the adult flag as
**sticky** (an edit can raise it but not silently lower it — un-flagging is a
deliberate action, so un-hydrated edit forms can't accidentally un-gate porn).

---

## 3. Ops / configuration required before this works in production

1. **Run the two migrations** against Supabase:
   `20260925_plus_entitlements.sql`, `20260925_adult_content_wall.sql`.
2. **Create the Plus product/price in Paddle**, set env
   `NEXT_PUBLIC_PADDLE_PLUS_PRICE_ID`. Confirm the real product name & price
   (the UI/handoff use "Plus" as a placeholder).
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (webhook entitlement writes).
4. Confirm the Paddle webhook is subscribed to `subscription.*` events.
5. `npm run gen:editions` runs in `prebuild`; no manual step, but re-run it after
   editing `editions.json`.

---

## 4. Known issues / decisions made

- **AA contrast:** the validator (strict WCAG 4.5:1 for body/meta/accentText on
  paper, onAccent on accent) found the designer's file had a few near-misses.
  - **Corrected** (were below a 4.0 hard floor): Almanac `meta` `#6D7361→#626757`,
    Riso `onAccent` `#1F3A93→#142661`.
  - **Still AA near-misses (4.13–4.40:1), left as-is, flagged for design review:**
    `late-edition` accentText, `penny-dreadful` accentText, `sakura` meta,
    `field-notes` accentText, `field-notes` onAccent. Run `STRICT=1 npm run
    validate:editions` to make these fail; fix the palette then flip CI to strict.

---

## 5. Punch list (follow-ups, not done in this pass)

**Editions completeness**
- [ ] Full profile-edition rendering: pass the owner's resolved `profile_edition`
      into `ProfileAccentScope` at the 3 profile render paths (ProfileClient,
      public `page.tsx`, PrivateProfileShell) via a server `resolveEdition`, and
      apply the reader's `alwaysReadInMyEdition`.
- [ ] Plus customisations: custom accent (reuse `profiles.accent_color`, validate
      OKLCH ≥4.5:1), custom nameplate font (curated list), custom masthead line
      (through the bio text filter). Columns exist; UI + validation don't.
- [ ] `match_system_theme` (light/dark edition slots) wiring.
- [ ] Onboarding "Pick your paper" step (handoff §4.4).
- [ ] Visited-profile "Printed in {edition}" popover (handoff §4.3).
- [ ] Adopt `--font-nameplate` on the profile display-name / desk-name components
      (currently nameplate == headline font).
- [ ] Never-re-theme audit: wordmark, 21+ stamp, safety UI, admin screens must
      look identical across all 33 editions (handoff §2 / acceptance checklist).
- [ ] Dynamic masthead lines (Observatory moon phase, Almanac season, Arcana card).

**Adult wall / segregation**
- [ ] Stand up the separate adult product (entity, PSP, age/ID + consent + §2257,
      NCMEC, moderation) — see §1. This is the big one.
- [ ] When that lands: open the `getFeedPosts` gate for verified-21+ opted-in
      viewers on the adult surface; add a dedicated "show adult" viewer pref
      (distinct from `show_sensitive_posts`).
- [ ] Hydrate the adult toggle in edit forms (thread `is_adult` through the feed /
      post fetches) so authors see the real state (server guard already prevents
      accidental un-flagging).

---

## 6. Acceptance checklist (handoff §7) status

- [x] Editions change tokens only (colours/fonts/rules) — layout untouched.
- [x] Contrast validated in CI (`validate:editions`); AA near-misses flagged (§4).
- [x] Server enforces entitlement; clients reflect it (`resolveEdition`).
- [x] Preview is free; only Apply is gated; Plus editions open the upgrade sheet.
- [x] Fonts for non-active editions are loaded on demand, not eagerly.
- [x] No hex literals added to components — everything via CSS vars.
- [x] Never-paywall editions (accessibility/wellbeing/identity) stay free.
- [ ] SectionsRail on a visited profile always in the reader's edition — pending
      full profile-edition wiring.
- [ ] Plus-lapse fallback after 14 days keeps stored prefs — grace logic done in
      `hasEntitlement`; end-to-end verification pending real Paddle events.
