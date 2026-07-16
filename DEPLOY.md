# Deploying be.vocl (Coolify)

be.vocl deploys on **Coolify**, built with **Nixpacks** (`nixpacks.toml`) and started as a
Next.js standalone server:

```
node .next/standalone/server.js   # PORT=3000, HOSTNAME=0.0.0.0
```

> `vercel.json` is **not used by Coolify** — it's retained only as a record of the intended
> cron schedule. See "Scheduled jobs" below for how crons actually run here.

---

## Environment variables

Set these in the Coolify application's **Environment Variables** (see `.env.example` for the
full annotated list). The must-haves for a working beta:

| Variable | Why it matters |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Core data + service-role cron/admin work |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Media storage + public URLs |
| `RESEND_API_KEY` | **Auth/reset/welcome/digest email.** If unset, email silently mock-succeeds and sends nothing (the digest route then deletes the pending notifications). Confirm the from-domain `noreply@be.vocl.app` matches the verified Resend domain. |
| `CRON_SECRET` | Gates every `/api/cron/*` endpoint. Cron **fails closed** if unset (401). Must match the value used by the scheduled tasks below. |
| `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET` | Image moderation (fail-open if unset) |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails/metadata |

Optional: `SPOTIFY_*`, `UNSPLASH_ACCESS_KEY`, `GIPHY_API_KEY`, `OPENAI_API_KEY` (voice transcription).

---

## Scheduled jobs (crons)

The app's periodic work lives behind HTTP endpoints gated by `CRON_SECRET`. On Vercel these
were driven by `vercel.json`; **Coolify ignores that file**, so we drive them with Coolify
**Scheduled Tasks** that run [`scripts/trigger-cron.mjs`](scripts/trigger-cron.mjs) inside the
app container.

If these tasks are not configured, the endpoints never fire and the failures are **silent**:
scheduled/queued posts never publish, data exports never process, and the daily digest never sends.

### Add these four Scheduled Tasks

In Coolify → your be.vocl application → **Scheduled Tasks** → add one per row:

| Name | Command | Frequency |
|---|---|---|
| cron-scheduled | `node scripts/trigger-cron.mjs scheduled` | `*/5 * * * *` |
| cron-queue | `node scripts/trigger-cron.mjs queue` | `*/15 * * * *` |
| cron-data-export | `node scripts/trigger-cron.mjs data-export` | `*/15 * * * *` |
| cron-digest | `node scripts/trigger-cron.mjs digest` | `0 18 * * *` |

The script reads `CRON_SECRET` from the container env and hits `http://127.0.0.1:$PORT`
(override with `CRON_INTERNAL_URL` if the app doesn't listen on `$PORT`/3000). It exits
non-zero on failure, so a broken task shows as **failed** in Coolify's task history.

### Verify a task manually

From the container terminal (Coolify → Terminal), or via the task's "Run" button:

```bash
node scripts/trigger-cron.mjs scheduled
# [trigger-cron] scheduled -> 200: {"success":true,"published":0,...}
```

A `401` means `CRON_SECRET` differs between the app env and what the endpoint expects
(they read the same var, so this usually means the var is unset in the running container).

---

## Pre-invite ops checklist

Beyond deploy, these gate a real friends beta (from `READINESS-AUDIT-2026-07-09.md`):

- [ ] All env vars above set; send yourself a magic link **and** a password signup end-to-end.
- [ ] Supabase Auth: **disable open signups** (invite-redemption + `shouldCreateUser:false` already enforced in code).
- [ ] Seed an admin — nothing bootstraps one; `profiles.role` defaults to 0:
      ```sql
      UPDATE profiles SET role = 10 WHERE username = 'your-admin-username';
      ```
- [ ] Existing test accounts: set `onboarding_completed = true` to skip the wizard, or let it run once.
- [ ] Confirm the four Scheduled Tasks above are added and each shows a green run.
