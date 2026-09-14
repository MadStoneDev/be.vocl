"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import {
  getUsers,
  banUser,
  restrictUser,
  unlockUser,
  setUserRole,
  setUserNsfw,
  type UserWithDetails,
} from "@/actions/admin";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "unlocked", label: "Active" },
  { value: "restricted", label: "Restricted" },
  { value: "banned", label: "Banned" },
];

/** Square avatar per the broadsheet spec — never circular. */
function SquareAvatar({ src, username, size = 36 }: { src?: string | null; username: string; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={username} className="flex-none object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="ph-image flex flex-none items-center justify-center" style={{ width: size, height: size }}>
      <span className="font-display text-sm text-ink">{username.charAt(0).toUpperCase()}</span>
    </span>
  );
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [banReason, setBanReason] = useState("");

  const loadUsers = async () => {
    setIsLoading(true);
    const result = await getUsers({
      search: searchQuery || undefined,
      lockStatus: statusFilter !== "all" ? statusFilter : undefined,
    });
    if (result.success && result.users) setUsers(result.users);
    setIsLoading(false);
  };

  useEffect(() => { loadUsers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(), 300);
    return () => clearTimeout(timer);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [searchQuery]);

  const handleBan = async () => {
    if (!selectedUser || !banReason.trim()) return;
    setActionLoading(true);
    await banUser(selectedUser.id, banReason);
    setSelectedUser(null);
    setBanReason("");
    loadUsers();
    setActionLoading(false);
  };
  const handleRestrict = async (userId: string) => { setActionLoading(true); await restrictUser(userId); loadUsers(); setActionLoading(false); };
  const handleUnlock = async (userId: string) => { setActionLoading(true); await unlockUser(userId); loadUsers(); setActionLoading(false); };
  const handleSetRole = async (userId: string, role: number) => { setActionLoading(true); await setUserRole(userId, role); loadUsers(); setActionLoading(false); };
  const handleToggleNsfw = async (userId: string, isNsfw: boolean) => { setActionLoading(true); await setUserNsfw(userId, isNsfw); loadUsers(); setActionLoading(false); };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" });

  const admins = users.filter((u) => u.role >= 10).length;
  const banned = users.filter((u) => u.lockStatus === "banned").length;

  const GRID = "grid grid-cols-[minmax(0,1fr)_110px_120px_64px_110px_auto] items-center gap-x-5";

  return (
    <div>
      <title>Users — Admin | be.vocl</title>

      {/* Title row */}
      <div className="flex items-end justify-between gap-4 pt-8 pb-4.5">
        <div>
          <div className="kicker kicker-accent mb-2.5">Records</div>
          <h1 className="type-display text-ink">Users</h1>
        </div>
        <span className="slug text-meta-dim hidden sm:block">
          {users.length} accounts · {admins} admins · {banned} banned
        </span>
      </div>

      {/* Filter + search row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-3">
        <div className="flex gap-5 overflow-x-auto">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatusFilter(t.value)}
              data-active={statusFilter === t.value}
              className="section-tab whitespace-nowrap hover:text-ink transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH BY USERNAME…"
          className="w-[240px] max-w-full border-b border-rule bg-transparent pb-1.5 font-mono text-[11px] tracking-[0.12em] uppercase text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><IconLoader2 size={32} className="animate-spin text-accent" /></div>
      ) : users.length === 0 ? (
        <p className="editorial-body text-meta py-16 text-center">No members match this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            {/* Header */}
            <div className={`${GRID} slug text-meta-dim py-2.5 border-b border-rule`}>
              <span>Member</span><span>Role</span><span>Status</span><span>Reports</span><span>Joined</span>
              <span className="text-right">Actions</span>
            </div>
            {/* Rows */}
            {users.map((user) => (
              <div key={user.id} className={`${GRID} border-b border-rule py-3.5`}>
                <div className="flex items-center gap-3.5 min-w-0">
                  <SquareAvatar src={user.avatarUrl} username={user.username} />
                  <div className="min-w-0">
                    <div className="font-sans text-sm font-medium text-ink truncate">@{user.username}</div>
                    {user.displayName && <div className="editorial-caption text-meta not-italic truncate">{user.displayName}</div>}
                  </div>
                </div>
                <select
                  value={user.role}
                  onChange={(e) => handleSetRole(user.id, Number(e.target.value))}
                  disabled={actionLoading}
                  className="border-b border-rule bg-transparent pb-1 font-sans text-[11px] uppercase tracking-[0.16em] text-ink-secondary focus:border-foreground focus:outline-none disabled:opacity-50"
                >
                  <option value={0}>User</option>
                  <option value={5}>Moderator</option>
                  <option value={10}>Admin</option>
                </select>
                <div className="byline text-meta">
                  {user.lockStatus}
                  <button
                    onClick={() => handleToggleNsfw(user.id, !user.isNsfw)}
                    disabled={actionLoading}
                    title="Toggle NSFW account flag"
                    className={`ml-2 font-mono text-[10px] tracking-[0.14em] transition-colors disabled:opacity-50 ${user.isNsfw ? "text-accent" : "text-meta-dim hover:text-ink"}`}
                  >
                    NSFW
                  </button>
                </div>
                <span className={`font-mono text-xs ${user.reportCount > 0 ? "text-accent" : "text-meta-dim"}`}>{user.reportCount}</span>
                <span className="byline text-meta">{formatDate(user.createdAt)}</span>
                <div className="flex items-center justify-end gap-4 byline">
                  {user.lockStatus === "unlocked" && (
                    <>
                      <button onClick={() => handleRestrict(user.id)} disabled={actionLoading} className="text-ink hover:text-accent transition-colors disabled:opacity-50">Restrict</button>
                      <button onClick={() => setSelectedUser(user)} disabled={actionLoading} className="text-ink hover:text-vocl-like transition-colors disabled:opacity-50">Ban</button>
                    </>
                  )}
                  {user.lockStatus === "restricted" && (
                    <>
                      <button onClick={() => handleUnlock(user.id)} disabled={actionLoading} className="text-ink hover:text-accent transition-colors disabled:opacity-50">Unlock</button>
                      <button onClick={() => setSelectedUser(user)} disabled={actionLoading} className="text-ink hover:text-vocl-like transition-colors disabled:opacity-50">Ban</button>
                    </>
                  )}
                  {user.lockStatus === "banned" && (
                    <button onClick={() => handleUnlock(user.id)} disabled={actionLoading} className="text-ink hover:text-accent transition-colors disabled:opacity-50">Unban</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer: count + single primary */}
      {!isLoading && users.length > 0 && (
        <div className="flex items-center justify-between gap-4 pt-5">
          <span className="slug text-meta-dim">Showing {users.length} of {users.length}</span>
          <Link href="/admin/invites" className="bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs px-6 py-3 hover:opacity-[0.88] transition-opacity">Invite a member</Link>
        </div>
      )}

      {/* Ban modal — editorial, reason required */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-md border border-rule bg-background p-6">
            <div className="kicker kicker-accent mb-2.5">Confirm · reason required</div>
            <h2 className="type-heading text-ink mb-4">Ban @{selectedUser.username}</h2>
            <label className="slug text-meta-dim block mb-2">Reason</label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="This reason is sent to the member and written to the audit trail…"
              rows={3}
              className="w-full border border-rule bg-transparent p-3 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none resize-none"
            />
            <div className="mt-5 flex justify-end gap-4 byline">
              <button onClick={() => setSelectedUser(null)} className="text-meta hover:text-ink transition-colors px-2 py-2.5">Cancel</button>
              <button
                onClick={handleBan}
                disabled={actionLoading || !banReason.trim()}
                className="bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs px-5 py-2.5 hover:opacity-[0.88] transition-opacity disabled:opacity-50"
              >
                {actionLoading ? "Banning…" : "Ban member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
