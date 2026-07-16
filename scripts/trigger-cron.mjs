#!/usr/bin/env node
/**
 * Cron trigger for Coolify Scheduled Tasks.
 *
 * The app's cron work lives behind HTTP endpoints gated by CRON_SECRET
 * (see src/app/api/cron/*). On Vercel these were driven by vercel.json,
 * which Coolify ignores. This script is what a Coolify Scheduled Task runs
 * *inside the app container* to hit one of those endpoints on schedule.
 *
 * Usage:  node scripts/trigger-cron.mjs <job>
 *   where <job> is one of: scheduled | queue | data-export | digest
 *
 * Requires CRON_SECRET in the environment (already set on the container).
 * Optional: CRON_INTERNAL_URL (default http://127.0.0.1:$PORT, PORT default 3000).
 *
 * Exits non-zero on any failure so the task shows as failed in Coolify.
 */

const JOBS = {
  scheduled: "/api/cron/scheduled",
  queue: "/api/cron/queue",
  "data-export": "/api/cron/data-export",
  digest: "/api/cron/digest",
};

const job = process.argv[2];

if (!job || !(job in JOBS)) {
  console.error(
    `[trigger-cron] unknown job "${job ?? ""}". Expected one of: ${Object.keys(
      JOBS,
    ).join(", ")}`,
  );
  process.exit(2);
}

const secret = process.env.CRON_SECRET;
if (!secret || secret.length === 0) {
  console.error("[trigger-cron] CRON_SECRET is not set — refusing to run.");
  process.exit(2);
}

const base = (
  process.env.CRON_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`
).replace(/\/+$/, "");
const url = `${base}${JOBS[job]}`;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 120_000);

try {
  const res = await fetch(url, {
    method: "GET",
    headers: { authorization: `Bearer ${secret}` },
    signal: controller.signal,
  });

  const body = await res.text();

  if (!res.ok) {
    console.error(`[trigger-cron] ${job} -> ${res.status} ${res.statusText}: ${body}`);
    process.exit(1);
  }

  console.log(`[trigger-cron] ${job} -> ${res.status}: ${body}`);
} catch (err) {
  const reason = err?.name === "AbortError" ? "timed out after 120s" : String(err);
  console.error(`[trigger-cron] ${job} request failed: ${reason}`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
