# be.vocl

**A personal daily broadsheet with a voice** — a voice-first, editorial social blogging platform. Invite-only private beta.

Built with Next.js 16 (App Router) · React 19 · TypeScript · TailwindCSS 4 · Supabase (Postgres/Auth/Realtime/RLS) · Cloudflare R2 · Resend · Paddle. Deployed on Coolify.

## Documentation

- **[PROJECT.md](./PROJECT.md)** — what be.vocl is, the design system, architecture, current status, and what's left to do. **Start here.**
- **[DEPLOY.md](./DEPLOY.md)** — deploy runbook (Coolify, env vars, scheduled tasks, pre-invite checklist).
- **[OPENPANEL-SETUP.md](./OPENPANEL-SETUP.md)** — self-hosted analytics setup.

Other root `.md` files are historical planning/audit docs, superseded by `PROJECT.md`.

## Development

```bash
npm install
npm run dev        # dev server on http://localhost:3111
npm run typecheck  # primary quality gate
```

Copy `.env.example` to `.env.local` and fill in the required values (see the env table in `DEPLOY.md`).
