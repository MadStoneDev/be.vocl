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

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved_ban", label: "Resolved (Ban)" },
  { value: "resolved_restrict", label: "Resolved (Restrict)" },
  { value: "resolved_dismissed", label: "Dismissed" },
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

  const handleResolve = async (resolution: "resolved_ban" | "resolved_restrict" | "resolved_dismissed") => {
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
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
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/50">No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-vocl-surface-dark rounded-2xl p-5 border border-white/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.source === "auto_moderation"
                        ? "bg-amber-500/20 text-amber-500"
                        : "bg-vocl-accent/20 text-vocl-accent"
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
                    <span className="text-xs text-foreground/50">
                      {formatDate(report.createdAt)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === "pending"
                        ? "bg-amber-500/20 text-amber-500"
                        : report.status === "reviewing"
                        ? "bg-blue-500/20 text-blue-500"
                        : report.status.startsWith("resolved")
                        ? "bg-green-500/20 text-green-500"
                        : "bg-white/10 text-foreground/50"
                    }`}>
                      {report.status.replace("resolved_", "").replace("_", " ")}
                    </span>
                  </div>

                  {/* Subject */}
                  <div className="font-semibold text-foreground mb-1">
                    {SUBJECT_LABELS[report.subject] || report.subject}
                  </div>

                  {/* Reported User */}
                  <div className="flex items-center gap-2 text-sm text-foreground/70 mb-2">
                    <span>Reported:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-vocl-surface-dark overflow-hidden">
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
                      <span className="font-medium">@{report.reportedUser.username}</span>
                    </div>
                  </div>

                  {/* Comments */}
                  {report.comments && (
                    <p className="text-sm text-foreground/60 line-clamp-2">
                      {report.comments}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {report.status === "pending" && (
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="px-4 py-2 bg-vocl-accent text-white rounded-xl text-sm font-medium hover:bg-vocl-accent-hover transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedReport(null)}
          />
          <div className="relative w-full max-w-lg mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Review Report</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-foreground/50">Subject</label>
                  <p className="text-foreground font-medium">
                    {SUBJECT_LABELS[selectedReport.subject] || selectedReport.subject}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-foreground/50">Reported User</label>
                  <p className="text-foreground font-medium">
                    @{selectedReport.reportedUser.username}
                  </p>
                </div>

                {selectedReport.comments && (
                  <div>
                    <label className="text-sm text-foreground/50">Details</label>
                    <p className="text-foreground">{selectedReport.comments}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-foreground/50 block mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about this decision..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleResolve("resolved_ban")}
                  disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-vocl-like text-white rounded-xl font-medium hover:bg-vocl-like/90 disabled:opacity-50"
                >
                  <IconX size={18} />
                  Ban User
                </button>
                <button
                  onClick={() => handleResolve("resolved_restrict")}
                  disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-500/90 disabled:opacity-50"
                >
                  <IconAlertTriangle size={18} />
                  Restrict
                </button>
                <button
                  onClick={() => handleResolve("resolved_dismissed")}
                  disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-foreground rounded-xl font-medium hover:bg-white/20 disabled:opacity-50"
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
