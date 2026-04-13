"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
  IconDownload,
  IconAlertOctagon,
  IconTrash,
  IconExternalLink,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import {
  requestDataExport,
  getExportStatus,
  deleteAccount,
} from "@/actions/account";
import { toast } from "@/components/ui";

type DeleteStep = "idle" | "warning" | "type-username" | "final";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [exportStatus, setExportStatus] = useState<{
    status?: string;
    fileUrl?: string;
    expiresAt?: string;
  }>({});
  const [requestingExport, setRequestingExport] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  const [deleteUsernameInput, setDeleteUsernameInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getExportStatus().then((r) => {
      if (r.success) {
        setExportStatus({
          status: r.status,
          fileUrl: r.fileUrl,
          expiresAt: r.expiresAt,
        });
      }
    });
  }, []);

  const handleRequestExport = async () => {
    setRequestingExport(true);
    const result = await requestDataExport();
    if (result.success) {
      toast.success("Export requested — we'll email you when ready");
      setExportStatus({ status: "pending" });
    } else {
      toast.error(result.error || "Failed to request export");
    }
    setRequestingExport(false);
  };

  const handleDelete = async () => {
    if (!profile || deleteUsernameInput !== profile.username) {
      toast.error("Username does not match");
      return;
    }
    setDeleting(true);
    const result = await deleteAccount();
    if (result.success) {
      toast.success("Account deleted");
      router.push("/login");
    } else {
      toast.error(result.error || "Failed to delete account");
      setDeleting(false);
    }
  };

  const exportPending =
    exportStatus.status === "pending" || exportStatus.status === "processing";

  return (
    <div className="py-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to settings
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-1">Account & Data</h1>
      <p className="text-sm text-foreground/60 mb-8">
        Manage your data and account.
      </p>

      {/* Data export */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <IconDownload size={20} className="text-vocl-accent" />
          Export your data
        </h2>
        <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5 space-y-3">
          <p className="text-sm text-foreground/70">
            Download a copy of all your posts, messages, and account data.
            We'll email you when it's ready (usually within a few minutes).
          </p>

          {exportStatus.status === "completed" && exportStatus.fileUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={exportStatus.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vocl-accent text-white text-sm font-medium"
              >
                Download export <IconExternalLink size={14} />
              </a>
              {exportStatus.expiresAt && (
                <span className="text-xs text-foreground/50">
                  Expires {new Date(exportStatus.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : exportPending ? (
            <p className="text-sm text-amber-400 inline-flex items-center gap-2">
              <IconLoader2 size={14} className="animate-spin" />
              Export in progress…
            </p>
          ) : (
            <button
              onClick={handleRequestExport}
              disabled={requestingExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vocl-accent text-white text-sm font-medium hover:bg-vocl-accent-hover disabled:opacity-50"
            >
              {requestingExport ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconDownload size={14} />
              )}
              Request data export
            </button>
          )}
        </div>
      </section>

      {/* Danger zone */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-rose-400 mb-3 flex items-center gap-2">
          <IconAlertOctagon size={20} />
          Danger zone
        </h2>
        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Delete account</h3>
            <p className="text-sm text-foreground/70">
              Permanently anonymizes your account. Your username becomes
              <span className="font-mono text-rose-400"> deleteduser-…</span>,
              all personal info is removed, follows are dropped, and you're
              signed out. Posts you authored remain visible but show
              "Deleted User" as the author.{" "}
              <span className="text-rose-300 font-medium">This cannot be undone.</span>
            </p>
          </div>

          {deleteStep === "idle" && (
            <button
              onClick={() => setDeleteStep("warning")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/30"
            >
              <IconTrash size={14} /> Delete my account
            </button>
          )}

          {deleteStep === "warning" && (
            <div className="space-y-3 pt-3 border-t border-rose-500/20">
              <p className="text-sm text-foreground/80">
                Before continuing, you may want to{" "}
                <button
                  onClick={() => setDeleteStep("idle")}
                  className="text-vocl-accent hover:underline"
                >
                  request a data export first
                </button>
                . Otherwise you'll lose access to everything you've posted.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteStep("type-username")}
                  className="px-3 py-2 rounded-xl bg-rose-500/30 text-rose-300 text-sm font-medium"
                >
                  Continue
                </button>
                <button
                  onClick={() => setDeleteStep("idle")}
                  className="px-3 py-2 rounded-xl bg-white/10 text-foreground text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === "type-username" && profile && (
            <div className="space-y-3 pt-3 border-t border-rose-500/20">
              <p className="text-sm text-foreground/80">
                Type your username{" "}
                <span className="font-mono text-rose-400">{profile.username}</span>{" "}
                to confirm.
              </p>
              <input
                type="text"
                value={deleteUsernameInput}
                onChange={(e) => setDeleteUsernameInput(e.target.value)}
                placeholder={profile.username}
                className="w-full px-3 py-2 rounded-xl bg-background/50 border border-rose-500/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteStep("final")}
                  disabled={deleteUsernameInput !== profile.username}
                  className="px-3 py-2 rounded-xl bg-rose-500/30 text-rose-300 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    setDeleteStep("idle");
                    setDeleteUsernameInput("");
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 text-foreground text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === "final" && (
            <div className="space-y-3 pt-3 border-t border-rose-500/20">
              <p className="text-sm text-rose-300 font-medium">
                Last chance. Once you click "Delete forever", your account is
                gone and there's no recovery.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
                >
                  {deleting ? (
                    <IconLoader2 size={14} className="animate-spin" />
                  ) : (
                    <IconTrash size={14} />
                  )}
                  Delete forever
                </button>
                <button
                  onClick={() => {
                    setDeleteStep("idle");
                    setDeleteUsernameInput("");
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 text-foreground text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
