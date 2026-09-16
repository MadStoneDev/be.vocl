"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  IconLoader2,
  IconUser,
  IconRobot,
  IconCheck,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  getReports,
  resolveReport,
  type ReportWithDetails,
} from "@/actions/admin";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";

/** Renders the reported post's body/media so moderators judge with eyes on the
 *  actual content (critical for minor-safety flags). */
function PostContentPreview({ post }: { post: NonNullable<ReportWithDetails["post"]> }) {
  const c: any = post.content || {};
  const type = post.postType;
  const images: string[] =
    c.urls ||
    (c.items ? c.items.map((i: any) => i.url) : null) ||
    c.imageUrls ||
    ((type === "image" || type === "gallery") && c.url ? [c.url] : []) ||
    [];

  return (
    <div className="rounded-none border border-rule p-3 space-y-3 max-h-80 overflow-y-auto">
      {type === "text" && (c.html || c.plain) && (
        <div
          className="type-body text-foreground/90 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtmlWithSafeLinks(c.html || `<p>${c.plain || ""}</p>`),
          }}
        />
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt="reported content"
              className="w-full h-36 object-cover rounded-none border border-rule"
            />
          ))}
        </div>
      )}
      {type === "video" && (c.embed_url || c.url) && (
        <a
          href={c.embed_url || c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent type-body underline break-all"
        >
          {c.embed_url || c.url}
        </a>
      )}
      {type === "audio" && c.url && <audio controls src={c.url} className="w-full" />}
      {c.caption_html && (
        <div
          className="type-meta text-foreground/60 border-t border-rule pt-2"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(c.caption_html) }}
        />
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved_ban", label: "Resolved (Ban)" },
  { value: "resolved_restrict", label: "Resolved (Restrict)" },
  { value: "resolved_dismissed", label: "Dismissed" },
  { value: "resolved_approved", label: "Approved" },
];

const SUBJECT_LABELS: Record<string, string> = {
  minor_safety: "Minor Safety",
  non_consensual: "Non-consensual",
  harassment: "Harassment",
  spam: "Spam",
  illegal: "Illegal",
  other: "Other",
};

export default function AdminReportsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "pending";

  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const loadReports = async () => {
    setIsLoading(true);
    const result = await getReports({ status: statusFilter });
    if (result.success && result.reports) {
      setReports(result.reports);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleResolve = async (
    resolution: "resolved_ban" | "resolved_restrict" | "resolved_dismissed" | "resolved_approved"
  ) => {
    if (!selectedReport) return;

    setResolving(true);
    const result = await resolveReport(selectedReport.id, resolution, resolutionNotes);
    if (result.success) {
      setSelectedReport(null);
      setResolutionNotes("");
      loadReports();
    }
    setResolving(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <title>Admin — Reports | be.vocl</title>
      <div className="flex items-end justify-between gap-4 pt-8 pb-4.5">
        <div>
          <div className="kicker kicker-accent mb-2.5">Moderation</div>
          <h1 className="type-display text-ink">Reports</h1>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-b border-rule bg-transparent pb-1.5 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-secondary focus:border-foreground focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <IconLoader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : reports.length === 0 ? (
        <p className="editorial-body text-meta py-16 text-center">No reports on the desk.</p>
      ) : (
        <div>
          {reports.map((report) => (
            <div
              key={report.id}
              className="border-b border-rule py-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`slug ${
                      report.source === "auto_moderation"
                        ? "text-amber-500"
                        : "text-accent"
                    }`}>
                      {report.source === "auto_moderation" ? (
                        <span className="flex items-center gap-1">
                          <IconRobot size={12} />
                          Auto
                        </span>
                      ) : (
                        "User Report"
                      )}
                    </span>
                    <span className="slug text-meta-dim">
                      {formatDate(report.createdAt)}
                    </span>
                    <span className={`slug ${
                      report.status === "pending"
                        ? "text-amber-500"
                        : report.status === "reviewing"
                        ? "text-blue-500"
                        : report.status.startsWith("resolved")
                        ? "text-green-500"
                        : "text-meta-dim"
                    }`}>
                      {report.status.replace("resolved_", "").replace("_", " ")}
                    </span>
                  </div>

                  {/* Subject */}
                  <h3 className="type-heading text-ink mb-1">
                    {SUBJECT_LABELS[report.subject] || report.subject}
                  </h3>

                  {/* Reported User */}
                  <div className="flex items-center gap-2 byline text-meta mb-2">
                    <span>Reported:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 overflow-hidden ph-image">
                        {report.reportedUser.avatarUrl ? (
                          <Image
                            src={report.reportedUser.avatarUrl}
                            alt=""
                            width={20}
                            height={20}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IconUser size={12} />
                          </div>
                        )}
                      </div>
                      <span className="text-ink">@{report.reportedUser.username}</span>
                    </div>
                  </div>

                  {/* Comments */}
                  {report.comments && (
                    <p className="editorial-body text-meta line-clamp-2">
                      {report.comments}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {report.status === "pending" && (
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="flex-none font-sans text-[11px] uppercase tracking-[0.16em] text-ink hover:text-accent transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedReport(null)}
          />
          <div className="relative w-full max-w-lg bg-background border border-rule">
            <div className="p-6">
              <div className="kicker kicker-accent mb-2.5">Review · decision logged</div>
              <h2 className="type-heading text-ink mb-4">Review Report</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="slug text-meta-dim">Subject</label>
                  <p className="editorial-body text-ink">
                    {SUBJECT_LABELS[selectedReport.subject] || selectedReport.subject}
                  </p>
                </div>

                <div>
                  <label className="slug text-meta-dim">Reported User</label>
                  <p className="editorial-body text-ink">
                    @{selectedReport.reportedUser.username}
                  </p>
                </div>

                {selectedReport.comments && (
                  <div>
                    <label className="slug text-meta-dim">Details</label>
                    <p className="editorial-body text-ink">{selectedReport.comments}</p>
                  </div>
                )}

                {selectedReport.post && (
                  <div>
                    <label className="slug text-meta-dim block mb-2">
                      Reported content
                    </label>
                    <PostContentPreview post={selectedReport.post} />
                  </div>
                )}

                <div>
                  <label className="slug text-meta-dim block mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about this decision..."
                    rows={3}
                    className="w-full border border-rule bg-transparent p-3 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none resize-none"
                  />
                </div>
              </div>

              {selectedReport.post && (
                <button
                  onClick={() => handleResolve("resolved_approved")}
                  disabled={resolving}
                  className="w-full flex items-center justify-center gap-2 border border-rule px-4 py-2.5 mb-3 font-sans font-medium uppercase tracking-[0.16em] text-xs text-green-600 hover:bg-vocl-hover transition-colors disabled:opacity-50"
                >
                  <IconCheck size={18} />
                  Approve &amp; publish post
                </button>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleResolve("resolved_ban")}
                  disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-vocl-like hover:bg-vocl-hover transition-colors disabled:opacity-50"
                >
                  <IconX size={18} />
                  Ban User
                </button>
                <button
                  onClick={() => handleResolve("resolved_restrict")}
                  disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-amber-500 hover:bg-vocl-hover transition-colors disabled:opacity-50"
                >
                  <IconAlertTriangle size={18} />
                  Restrict
                </button>
                <button
                  onClick={() => handleResolve("resolved_dismissed")}
                  disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 border border-rule px-4 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-ink hover:bg-vocl-hover transition-colors disabled:opacity-50"
                >
                  <IconCheck size={18} />
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
