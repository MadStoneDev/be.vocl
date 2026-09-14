"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconLoader2 } from "@tabler/icons-react";
import { getAdminStats, getReports, getAuditLogs, type ReportWithDetails, type AuditLogRow } from "@/actions/admin";
import { adminGetInviteStats } from "@/actions/invites";

interface Stats {
  pendingReports: number;
  pendingFlags: number;
  pendingAppeals: number;
  escalatedItems: number;
  bannedUsers: number;
  restrictedUsers: number;
  activeInviteCodes: number;
}

function ageOf(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const DATE = new Date().toLocaleDateString("en-AU", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function AdminQueue() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [log, setLog] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [adminResult, inviteResult, reportsResult, auditResult] = await Promise.all([
        getAdminStats(),
        adminGetInviteStats(),
        getReports({ status: "pending" }),
        getAuditLogs({ limit: 2 }),
      ]);
      if (adminResult.success && adminResult.stats) {
        setStats({ ...adminResult.stats, activeInviteCodes: inviteResult.stats?.activeCodes || 0 });
      }
      if (reportsResult.success && reportsResult.reports) setReports(reportsResult.reports);
      if (auditResult.success && auditResult.logs) setLog(auditResult.logs);
      setIsLoading(false);
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <IconLoader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  const escalated = reports.filter((r) => r.status === "escalated");
  const normal = reports.filter((r) => r.status !== "escalated");
  const expandedNormal = normal.slice(0, 2);
  const collapsed = normal.slice(2);

  const figures: { label: string; value: number; accent?: boolean }[] = [
    { label: "Pending reports", value: stats?.pendingReports || 0 },
    { label: "Pending flags", value: stats?.pendingFlags || 0 },
    { label: "Escalated", value: stats?.escalatedItems || 0, accent: (stats?.escalatedItems || 0) > 0 },
    { label: "Appeals", value: stats?.pendingAppeals || 0 },
    { label: "Banned · restricted", value: (stats?.bannedUsers || 0) + (stats?.restrictedUsers || 0) },
    { label: "Active codes", value: stats?.activeInviteCodes || 0 },
  ];

  return (
    <div>
      <title>The Queue — Admin | be.vocl</title>

      {/* Date + sort strip */}
      <div className="flex items-center justify-between gap-4 border-b-[3px] border-double border-rule py-4 byline text-meta">
        <span className="truncate">{DATE} · Late edition</span>
        <span className="flex gap-5">
          <span className="hover:text-ink transition-colors">Oldest first</span>
          <span data-active="true" className="section-tab">Severity</span>
          <span className="hover:text-ink transition-colors">Unassigned</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] pt-7">
        {/* Worklist */}
        <div className="lg:pr-9">
          <div className="kicker kicker-accent mb-3">The queue</div>
          <h1 className="type-display text-ink">
            {reports.length === 0 ? "The desk is clear." : `${reports.length} ${reports.length === 1 ? "item" : "items"}, worst first.`}
          </h1>
          <p className="editorial-deck text-body mt-2">
            Decide, or pass it to the founder. Every action is written to the audit trail.
          </p>

          {reports.length === 0 && (
            <p className="editorial-body text-meta mt-8">Nothing is waiting on the desk tonight.</p>
          )}

          {/* Escalated — expanded, accent rule */}
          {escalated.map((r) => (
            <div key={r.id} className="mt-6 border-t border-l-2 border-l-accent border-rule pl-[22px] py-6">
              <div className="slug text-accent mb-2.5">
                Escalated <span className="text-meta-dim">· {ageOf(r.createdAt)} · {r.source}</span>
              </div>
              <h3 className="type-heading text-ink mb-2.5">{r.subject}</h3>
              {r.comments && <p className="editorial-body italic text-ink-secondary mb-3 max-w-[64ch]">“{r.comments}”</p>}
              <div className="byline text-meta pb-3.5 flex flex-wrap gap-x-3 gap-y-1">
                <span>Against @{r.reportedUser.username}</span><span>·</span>
                <span>Raised by {r.reporter ? `@${r.reporter.username}` : "system"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 border-t border-rule pt-3.5">
                <Link href={`/admin/users?u=${r.reportedUser.username}`} className="bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-[11.5px] px-5 py-2.5 hover:opacity-[0.88] transition-opacity">Restrict author</Link>
                <Link href="/admin/reports?status=escalated" className="border border-foreground text-ink font-sans font-medium uppercase tracking-[0.16em] text-[11.5px] px-[19px] py-2.5 hover:bg-vocl-hover transition-colors">Remove post</Link>
                <Link href="/admin/reports?status=escalated" className="slug text-meta hover:text-ink transition-colors">Dismiss</Link>
                <Link href={`/admin/users?u=${r.reportedUser.username}`} className="slug text-meta hover:text-ink transition-colors ml-auto">Open dossier →</Link>
              </div>
            </div>
          ))}

          {/* Normal — expanded with text actions */}
          {expandedNormal.map((r) => (
            <div key={r.id} className="border-t border-rule py-5">
              <div className="slug text-meta-dim mb-2.5">
                <span className="text-meta">{r.source}</span> · {ageOf(r.createdAt)}
              </div>
              <h3 className="type-heading text-ink mb-2.5">{r.subject}</h3>
              <p className="editorial-body text-body mb-3 max-w-[64ch]">
                Against @{r.reportedUser.username}. Raised by {r.reporter ? `@${r.reporter.username}` : "system"}.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 byline">
                <Link href="/admin/reports" className="text-ink border-b border-rule pb-[3px] hover:text-accent transition-colors">Tag NSFW</Link>
                <Link href="/admin/reports" className="text-ink border-b border-rule pb-[3px] hover:text-accent transition-colors">Remove post</Link>
                <Link href={`/admin/users?u=${r.reportedUser.username}`} className="text-ink border-b border-rule pb-[3px] hover:text-accent transition-colors">Restrict author</Link>
                <Link href="/admin/reports" className="text-meta hover:text-ink transition-colors">Dismiss</Link>
                <Link href="/admin/reports" className="text-meta hover:text-ink transition-colors ml-auto">Open →</Link>
              </div>
            </div>
          ))}

          {/* Collapsed rows */}
          {collapsed.map((r) => (
            <Link key={r.id} href="/admin/reports" className="group flex items-baseline gap-5 border-t border-rule py-4 last:border-b">
              <span className="slug text-meta-dim w-[150px] flex-none">{r.source} · {ageOf(r.createdAt)}</span>
              <span className="editorial-body text-ink-secondary flex-1 group-hover:text-accent transition-colors">{r.subject}</span>
              <span className="slug text-meta">Open</span>
            </Link>
          ))}
        </div>

        {/* Standing figures rail */}
        <aside className="mt-10 border-rule lg:mt-0 lg:border-l lg:pl-8">
          <div className="slug text-meta border-b border-rule pb-2.5">Standing figures</div>
          {figures.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between border-b border-rule py-2.5">
              <span className={`text-[12.5px] ${f.accent ? "text-accent" : "text-ink-secondary"}`}>{f.label}</span>
              <span className={`font-display text-xl leading-none ${f.accent ? "text-accent" : f.value === 0 ? "text-meta-dim" : "text-ink"}`}>{f.value}</span>
            </div>
          ))}

          <div className="slug text-meta border-b border-rule pb-2.5 pt-7">Desk log</div>
          {log.length > 0 ? (
            log.map((l) => (
              <div key={l.id} className="border-b border-rule py-3">
                <div className="editorial-body text-[14.5px] text-ink-secondary">
                  {l.actorUsername ? `@${l.actorUsername}` : "System"} {l.action.replace(/_/g, " ")}
                  {l.targetUserUsername ? ` @${l.targetUserUsername}` : ""}.
                </div>
                <div className="slug text-meta-dim mt-1.5">{ageOf(l.createdAt)} ago</div>
              </div>
            ))
          ) : (
            <p className="editorial-body text-meta py-3 text-[14.5px]">No actions logged yet.</p>
          )}
          <Link href="/admin/audit" className="slug text-meta hover:text-accent transition-colors mt-3.5 inline-block">Full audit trail</Link>

          <div className="slug text-meta border-b border-rule pb-2.5 pt-7">Desk shortcuts</div>
          <div className="flex flex-col gap-2.5 pt-3 text-[12.5px] text-ink-secondary">
            <Link href="/admin/invites" className="hover:text-accent transition-colors">Generate invite codes</Link>
            <Link href="/admin/email" className="hover:text-accent transition-colors">Compose an announcement</Link>
            <Link href="/admin/email" className="hover:text-accent transition-colors">Review email templates</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
