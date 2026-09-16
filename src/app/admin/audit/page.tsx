"use client";

import { useEffect, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { getAuditLogs, type AuditLogRow } from "@/actions/admin";

const ACTION_LABELS: Record<string, string> = {
  ban_user: "Banned user",
  restrict_user: "Restricted user",
  unlock_user: "Unlocked user",
  change_role: "Changed role",
  resolve_report: "Resolved report",
  resolve_flag: "Resolved flag",
  review_appeal: "Reviewed appeal",
  assign_report: "Assigned report",
  assign_flag: "Assigned flag",
  remove_post: "Removed post",
  restore_post: "Restored post",
  delete_post: "Deleted post",
  ip_ban: "IP ban",
  set_nsfw: "Set NSFW flag",
};

// Actions that removed/sanctioned get a warmer tone.
const STRONG = new Set(["ban_user", "restrict_user", "remove_post", "delete_post", "ip_ban"]);

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuditLogs({ limit: 100 }).then((res) => {
      if (res.success && res.logs) {
        setLogs(res.logs);
      } else {
        setError(res.error || "Failed to load audit log");
      }
      setIsLoading(false);
    });
  }, []);

  const formatDate = (s: string) =>
    new Date(s).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <title>Admin — Audit Log | be.vocl</title>
      <div className="pt-8 pb-4.5">
        <div className="kicker kicker-accent mb-2.5">The record</div>
        <h1 className="type-display text-ink">Audit Log</h1>
        <p className="editorial-deck text-body mt-2">
          Every moderation action, most recent first.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <IconLoader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : error ? (
        <p className="editorial-body text-meta py-16 text-center">{error}</p>
      ) : logs.length === 0 ? (
        <p className="editorial-body text-meta py-16 text-center">No actions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-none border border-rule">
          <table className="w-full type-body">
            <thead>
              <tr className="text-left text-meta-dim border-b border-rule">
                <th className="px-4 py-3 slug">When</th>
                <th className="px-4 py-3 slug">Moderator</th>
                <th className="px-4 py-3 slug">Action</th>
                <th className="px-4 py-3 slug">Target</th>
                <th className="px-4 py-3 slug">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-rule last:border-0 align-top">
                  <td className="px-4 py-3 text-foreground/50 whitespace-nowrap tabular-nums">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                    {log.actorUsername ? `@${log.actorUsername}` : "system"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`slug ${
                        STRONG.has(log.action)
                          ? "text-vocl-like"
                          : "text-ink-secondary"
                      }`}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/70 whitespace-nowrap">
                    {log.targetUserUsername ? `@${log.targetUserUsername}` : ""}
                    {log.targetPostId ? (
                      <a
                        href={`/post/${log.targetPostId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-accent underline"
                      >
                        post
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-foreground/40 max-w-xs">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <code className="type-meta break-words">
                        {JSON.stringify(log.details)}
                      </code>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
