# Self-hosting OpenPanel on Coolify — shared agency analytics

One OpenPanel instance hosts **every client site + project** (goingdark, peninsulahomes,
nikitamorell, thedirtagency, be.vocl, justreel, qrmory, tabletopchronicles, …) — each as a
separate Project with its own dashboard. Cookieless, no consent banner, and you own the data.

> **Facts below verified against OpenPanel's official self-hosting docs.** Two items are
> explicitly flagged **"verify in-instance"** because they aren't formally documented
> (retention table, exact API path).

---

## 1. The box

| Stage | Spec | Handles |
|---|---|---|
| **Start** | 4 GB RAM / 2 vCPU / 80 GB SSD | ~1–2M events/mo — enough to onboard the whole portfolio at <100k each |
| **Target** | **8 GB / 4 vCPU / 80 GB SSD** | "millions/mo" — dozens of sites with headroom |

- **Dedicated box** — do **not** co-locate with an app server. ClickHouse (`op-ch`) reserves
  RAM aggressively and is the OOM risk.
- Hetzner reference: CX22/CPX21 (4 GB, ~€6–8/mo) → resize to CPX31 (8 GB, ~€15–20/mo). It's a
  vertical resize, not a migration.
- **Disk grows with total event history across all tenants** — set retention (§6) and leave room.

---

## 2. Deploy on Coolify

OpenPanel is a **first-class Coolify one-click service**.

1. Coolify → your Project → **New Resource → Services** → search **"OpenPanel"** → Deploy.
2. Coolify auto-generates `DATABASE_URL`, `REDIS_URL`, `CLICKHOUSE_URL`, and `COOKIE_SECRET`.
3. Assign the domain (e.g. `analytics.youragency.com`); Coolify provisions Let's Encrypt TLS
   once DNS resolves.

Six services come up: **op-api, op-dashboard, op-worker, op-db (Postgres), op-kv (Redis),
op-ch (ClickHouse)**. (Alternative for more control: deploy the compose from the repo's
`self-hosting` branch as a Coolify "Docker Compose" resource. Don't run the repo's `./setup`
scripts on Coolify — the service template handles it.)

---

## 3. Env / secrets

| Var | Set to | Note |
|---|---|---|
| `API_URL` | `https://analytics.youragency.com/api` | **Required** — public API the browser/proxy hits |
| `DASHBOARD_URL` | `https://analytics.youragency.com` | **Required** |
| `COOKIE_SECRET` | `openssl rand -base64 32` | **MUST NOT be the default.** Coolify auto-generates one — keep it. |
| `DATABASE_URL` / `REDIS_URL` / `CLICKHOUSE_URL` | auto | Coolify fills these |
| `SELF_HOSTED` | `true` | |
| `ALLOW_REGISTRATION` | leave default | Locks after the first user registers (see §4) |
| `RESEND_API_KEY` **or** `SMTP_HOST` + `EMAIL_SENDER` | your mailer | Optional but recommended (invites, password resets) |

---

## 4. First run

There's no CLI seed. After the services are healthy, open `DASHBOARD_URL` and **register — the
first account becomes the org owner/admin, and registration auto-locks afterward.** (If it locks
before you register, flip `ALLOW_REGISTRATION` to re-open briefly.)

---

## 5. A Project per client → get the client id

1. Dashboard → **New Project** per client site. Each project ships its **own dashboard**.
2. Each project auto-creates a default **`write` client** with a **`clientId`** (for browser
   tracking) and a **`clientSecret`** (server-side events only — **shown once**, capture it if
   you need it).
3. Share a client's dashboard **publicly or password-protected** so they view analytics without
   an account.

**CORS:** there is **no per-domain allowlist** — browser events are authenticated by `clientId`,
so a new site just needs its id dropped in. (The same-origin proxy in §7 sidesteps CORS entirely
anyway.)

---

## 6. Retention & backups

**Retention** — *not a documented UI toggle*; cap history at the ClickHouse layer. Add a row TTL
to the events table, e.g. `TTL created_at + INTERVAL 180 DAY`, applied on background merges.
⚠️ **Verify the exact table/column names inside your instance first** (the schema is
OpenPanel-managed and upgrades may touch it); test on a copy.

**Backups** — schedule these:
- **`op-ch` (ClickHouse) — critical.** Every event lives here; irreplaceable. Use
  `clickhouse-backup` / `BACKUP TABLE` or snapshot the volume.
- **`op-db` (Postgres) — critical.** Orgs, projects, users, dashboards, client ids/secrets,
  saved reports. Scheduled `pg_dump`.
- **`op-kv` (Redis) — skip.** Just the event queue/cache; losing it costs a few seconds of
  un-ingested events, not history.

---

## 7. Wire up a site

### Next.js apps (be.vocl — already done; justreel/qrmory/tabletopchronicles use this pattern)
be.vocl uses the **same-origin proxy** — `src/app/api/op/[...op]/route.ts` +
`src/components/analytics/Analytics.tsx` (`<OpenPanelComponent apiUrl="/api/op"
scriptUrl="/api/op/op1.js" …>`). This makes tracking first-party (ad-blocker-resistant) and
preserves the real visitor IP. **Just set two env vars** on the be.vocl deploy:

```
NEXT_PUBLIC_OPENPANEL_CLIENT_ID=<be.vocl project client id>
OPENPANEL_API_URL=https://analytics.youragency.com/api    # server-side, used by the proxy
```

Nothing tracks until `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` is set. Copy `src/app/api/op/` +
`src/components/analytics/Analytics.tsx` into the other Next.js projects.

### Non-Next sites (client HTML/WordPress/etc.)
Drop the script snippet, pointing `apiUrl` at your instance. Serve `op1.js` same-origin if you
can (reverse-proxy `/op1.js` → instance) to beat ad-blockers; otherwise the CDN default works.

```html
<script src="https://analytics.youragency.com/op1.js" defer async></script>
<script>
  window.op = window.op || function (...a) { (window.op.q = window.op.q || []).push(a); };
  window.op('init', {
    clientId: 'THIS_CLIENTS_CLIENT_ID',
    apiUrl: 'https://analytics.youragency.com/api',
    trackScreenViews: true, trackOutgoingLinks: true, trackAttributes: true,
  });
</script>
```

---

## 8. Coolify gotchas

- **Persistent volumes** — confirm `op-ch` and `op-db` are on **named persistent volumes** after
  the first deploy. A redeploy that drops an anonymous ClickHouse volume loses all analytics.
- **Migrations** run automatically on `op-api` startup — no manual step; in-place upgrades are
  seamless.
- **ClickHouse memory** — if you set per-container limits in Coolify, cap the Node services, not
  `op-ch`. Give ClickHouse startup grace on health checks (it's slower to go healthy than the
  Node containers).
- **Real client IP** — behind Traefik/Cloudflare, ensure the visitor IP is forwarded (the §7
  proxy handles this; direct setups must not strip it) or geo/device data degrades.
- **API must be HTTPS, and `API_URL`/`DASHBOARD_URL` must match it** — the biggest first-run
  trap. If `op-api` is left on Coolify's auto `http://…sslip.io` domain, the HTTPS dashboard
  throws *"Mixed Content … blocked"* on sign-up because it calls the API over HTTP. Fix: give
  `op-api` an HTTPS domain (a real subdomain + Let's Encrypt is stablest), set `API_URL` /
  `DASHBOARD_URL` to the `https://` URLs, then **redeploy `op-dashboard`** — the API URL is
  compiled into its client bundle, so an env change alone won't take.

---

### TL;DR
One-click **OpenPanel** in Coolify → set `API_URL`/`DASHBOARD_URL`, keep the generated
`COOKIE_SECRET` → confirm `op-ch`/`op-db` volumes are persistent → register first user (admin) →
**Project per client**, grab each `clientId` → set be.vocl's `NEXT_PUBLIC_OPENPANEL_CLIENT_ID`
+ `OPENPANEL_API_URL` → add a ClickHouse TTL for retention → schedule `pg_dump` + ClickHouse
backups (skip Redis). Start on 4 GB, resize to 8 GB as aggregate events climb.
