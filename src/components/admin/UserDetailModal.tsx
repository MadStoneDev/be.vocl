"use client";

import { useEffect, useState, useCallback } from "react";
import {
  IconX,
  IconLoader2,
  IconCircleCheck,
  IconShieldLock,
  IconMail,
} from "@tabler/icons-react";
import { Avatar, Portal } from "@/components/ui";
import {
  getUserDetail,
  setUserRole,
  setUserNsfw,
  setBetaAccess,
  banUser,
  restrictUser,
  unlockUser,
  type UserDetail,
} from "@/actions/admin";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-t border-vocl-border/60 first:border-t-0">
      <span className="type-meta font-semibold uppercase tracking-wide text-foreground/45 flex-shrink-0">
        {label}
      </span>
      <span className="type-body text-foreground/90 text-right min-w-0 break-words">
        {children}
      </span>
    </div>
  );
}

function Pill({
  on,
  onLabel,
  offLabel,
  tone = "primary",
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  tone?: "primary" | "rose" | "amber" | "green";
}) {
  const tones = {
    primary: "bg-vocl-primary/20 text-vocl-primary",
    rose: "bg-rose-500/20 text-rose-400",
    amber: "bg-amber-500/20 text-amber-500",
    green: "bg-green-500/20 text-green-500",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full type-meta font-semibold ${
        on ? tones[tone] : "bg-foreground/5 text-foreground/40"
      }`}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}

const ROLE_NAMES: Record<number, string> = { 0: "User", 5: "Moderator", 10: "Admin" };

export function UserDetailModal({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [showBan, setShowBan] = useState(false);

  const load = useCallback(async () => {
    const res = await getUserDetail(userId);
    if (res.success && res.user) setDetail(res.user);
    else setError(res.error || "Failed to load user");
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    await fn();
    await load();
    onChanged();
    setBusy(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border border-vocl-border rounded-sm elevate-lg">
          {loading || !detail ? (
            <div className="flex items-center justify-center py-24">
              <IconLoader2 size={28} className="animate-spin text-vocl-primary" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 p-5 border-b border-vocl-border">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={detail.avatarUrl} username={detail.username} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="type-display text-xl text-foreground truncate">
                        {detail.displayName || `@${detail.username}`}
                      </h2>
                      {detail.isVerified && (
                        <IconCircleCheck size={18} className="text-vocl-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="type-meta text-foreground/55 truncate">@{detail.username}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-vocl-hover transition-colors flex-shrink-0"
                >
                  <IconX size={20} className="text-foreground/60" />
                </button>
              </div>

              {error && (
                <p className="px-5 pt-3 type-body text-vocl-like">{error}</p>
              )}

              <div className="p-5 space-y-5">
                {detail.bio && (
                  <p className="type-body text-foreground/75 italic">“{detail.bio}”</p>
                )}

                {/* Account */}
                <section>
                  <h3 className="type-meta font-semibold uppercase tracking-widest text-vocl-primary mb-1">
                    Account
                  </h3>
                  <Row label="Email">
                    <span className="inline-flex items-center gap-1.5">
                      <IconMail size={14} className="text-foreground/40" />
                      {detail.email || "—"}
                      {detail.email &&
                        (detail.emailConfirmed ? (
                          <IconCircleCheck size={14} className="text-green-500" />
                        ) : (
                          <span className="type-meta text-amber-500">unverified</span>
                        ))}
                    </span>
                  </Row>
                  <Row label="Last sign-in">{fmtDate(detail.lastSignInAt)}</Row>
                  <Row label="2FA">
                    <Pill on={detail.mfaEnabled} onLabel="Enabled" offLabel="Off" tone="green" />
                  </Row>
                  <Row label="Joined">{fmtDate(detail.createdAt)}</Row>
                  <Row label="Onboarded">
                    <Pill on={detail.onboardingCompleted} onLabel="Yes" offLabel="No" tone="green" />
                  </Row>
                  <Row label="Invite used">{detail.inviteCodeUsed || "—"}</Row>
                  <Row label="Invites left">{detail.inviteCodesRemaining ?? "—"}</Row>
                  <Row label="User ID">
                    <span className="font-mono type-meta text-foreground/60">{detail.id}</span>
                  </Row>
                </section>

                {/* Safety & status */}
                <section>
                  <h3 className="type-meta font-semibold uppercase tracking-widest text-vocl-primary mb-1">
                    Safety &amp; status
                  </h3>
                  <Row label="Status">
                    <Pill
                      on={detail.lockStatus !== "unlocked"}
                      onLabel={detail.lockStatus}
                      offLabel="active"
                      tone={detail.lockStatus === "banned" ? "rose" : "amber"}
                    />
                  </Row>
                  {detail.banReason && <Row label="Ban reason">{detail.banReason}</Row>}
                  <Row label="Age">
                    {detail.age != null ? (
                      <span className={detail.age < 18 ? "text-rose-400 font-semibold" : ""}>
                        {detail.age}
                        {detail.dateOfBirth ? ` · ${fmtDate(detail.dateOfBirth).split(",")[0]}` : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Row>
                  <Row label="NSFW">
                    <Pill on={detail.isNsfw} onLabel="Flagged" offLabel="No" tone="rose" />
                  </Row>
                  <Row label="Beta access">
                    <Pill on={detail.betaAccess} onLabel="Yes" offLabel="No" />
                  </Row>
                  <Row label="Appeals">
                    <Pill on={detail.appealsBlocked} onLabel="Blocked" offLabel="Allowed" tone="amber" />
                  </Row>
                  <Row label="Profile">
                    {detail.isProfilePublic ? "Public" : "Private"}
                    {detail.isDiscoverable ? " · discoverable" : ""}
                  </Row>
                  <Row label="Reports">
                    {detail.reportCount > 0 ? (
                      <span className="text-amber-500 font-semibold">{detail.reportCount}</span>
                    ) : (
                      "0"
                    )}
                  </Row>
                </section>

                {/* Footprint */}
                <section>
                  <h3 className="type-meta font-semibold uppercase tracking-widest text-vocl-primary mb-1">
                    Footprint
                  </h3>
                  <Row label="Followers">{detail.followerCount.toLocaleString()}</Row>
                  <Row label="Posts">{detail.postCount.toLocaleString()}</Row>
                </section>
              </div>

              {/* Actions */}
              <div className="border-t border-vocl-border p-5 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <IconShieldLock size={16} className="text-foreground/40" />
                  <select
                    value={detail.role}
                    onChange={(e) => act(() => setUserRole(userId, Number(e.target.value)))}
                    disabled={busy}
                    className="px-2 py-1 rounded-lg bg-vocl-hover border border-vocl-border text-sm text-foreground focus:outline-none disabled:opacity-50"
                  >
                    {Object.entries(ROLE_NAMES).map(([v, name]) => (
                      <option key={v} value={v}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => act(() => setUserNsfw(userId, !detail.isNsfw))}
                    disabled={busy}
                    className={`px-2.5 py-1 rounded-full type-meta font-semibold transition-colors disabled:opacity-50 ${
                      detail.isNsfw
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-foreground/5 text-foreground/40 hover:bg-foreground/10"
                    }`}
                  >
                    NSFW
                  </button>
                  <button
                    onClick={() => act(() => setBetaAccess(userId, !detail.betaAccess))}
                    disabled={busy}
                    className={`px-2.5 py-1 rounded-full type-meta font-semibold transition-colors disabled:opacity-50 ${
                      detail.betaAccess
                        ? "bg-vocl-primary/20 text-vocl-primary"
                        : "bg-foreground/5 text-foreground/40 hover:bg-foreground/10"
                    }`}
                  >
                    BETA
                  </button>
                  {busy && <IconLoader2 size={16} className="animate-spin text-vocl-primary" />}
                </div>

                {/* Lock actions */}
                {!showBan ? (
                  <div className="flex flex-wrap gap-2">
                    {detail.lockStatus === "unlocked" && (
                      <>
                        <button
                          onClick={() => act(() => restrictUser(userId))}
                          disabled={busy}
                          className="px-3 py-1.5 type-meta font-semibold text-amber-500 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          Restrict
                        </button>
                        <button
                          onClick={() => setShowBan(true)}
                          disabled={busy}
                          className="px-3 py-1.5 type-meta font-semibold text-vocl-like bg-vocl-like/10 rounded-lg hover:bg-vocl-like/20 disabled:opacity-50"
                        >
                          Ban
                        </button>
                      </>
                    )}
                    {detail.lockStatus === "restricted" && (
                      <>
                        <button
                          onClick={() => act(() => unlockUser(userId))}
                          disabled={busy}
                          className="px-3 py-1.5 type-meta font-semibold text-green-500 bg-green-500/10 rounded-lg hover:bg-green-500/20 disabled:opacity-50"
                        >
                          Unlock
                        </button>
                        <button
                          onClick={() => setShowBan(true)}
                          disabled={busy}
                          className="px-3 py-1.5 type-meta font-semibold text-vocl-like bg-vocl-like/10 rounded-lg hover:bg-vocl-like/20 disabled:opacity-50"
                        >
                          Ban
                        </button>
                      </>
                    )}
                    {detail.lockStatus === "banned" && (
                      <button
                        onClick={() => act(() => unlockUser(userId))}
                        disabled={busy}
                        className="px-3 py-1.5 type-meta font-semibold text-green-500 bg-green-500/10 rounded-lg hover:bg-green-500/20 disabled:opacity-50"
                      >
                        Unban
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Reason for banning (required)…"
                      rows={2}
                      className="w-full px-3 py-2 rounded-sm bg-vocl-hover border border-vocl-border text-foreground type-body placeholder:text-foreground/40 focus:outline-none focus:border-vocl-primary resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowBan(false);
                          setBanReason("");
                        }}
                        className="flex-1 py-2 rounded-sm type-meta font-semibold text-foreground/70 hover:bg-vocl-hover"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          act(async () => {
                            await banUser(userId, banReason);
                            setShowBan(false);
                            setBanReason("");
                          })
                        }
                        disabled={busy || !banReason.trim()}
                        className="flex-1 py-2 rounded-sm bg-vocl-like text-white type-meta font-semibold hover:bg-vocl-like/90 disabled:opacity-50"
                      >
                        Ban user
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
