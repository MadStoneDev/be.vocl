"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import { getUsers, type UserWithDetails } from "@/actions/admin";
import { UserDetailModal } from "@/components/admin/UserDetailModal";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "unlocked", label: "Active" },
  { value: "restricted", label: "Restricted" },
  { value: "banned", label: "Banned" },
];

const ROLE_LABELS: Record<number, string> = { 0: "User", 5: "Moderator", 10: "Admin" };

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
  // Row click opens the full dossier modal (all member actions live inside it).
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    const result = await getUsers({
      search: searchQuery || undefined,
      lockStatus: statusFilter !== "all" ? statusFilter : undefined,
    });
    if (result.success && result.users) setUsers(result.users);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" });

  const admins = users.filter((u) => u.role >= 10).length;
  const banned = users.filter((u) => u.lockStatus === "banned").length;

  const GRID = "grid grid-cols-[minmax(0,1fr)_100px_110px_70px_64px_100px_auto] items-center gap-x-5";

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
              <span>Member</span><span>Role</span><span>Status</span><span>Flags</span><span>Reports</span><span>Joined</span>
              <span className="text-right">Actions</span>
            </div>
            {/* Rows — whole row opens the dossier */}
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`${GRID} w-full border-b border-rule py-3.5 text-left hover:bg-vocl-hover transition-colors`}
              >
                <span className="flex items-center gap-3.5 min-w-0">
                  <SquareAvatar src={user.avatarUrl} username={user.username} />
                  <span className="min-w-0">
                    <span className="block font-sans text-sm font-medium text-ink truncate">@{user.username}</span>
                    {user.displayName && <span className="block editorial-caption text-meta not-italic truncate">{user.displayName}</span>}
                  </span>
                </span>
                <span className="byline text-meta">{ROLE_LABELS[user.role] ?? `Role ${user.role}`}</span>
                <span className="byline text-meta">{user.lockStatus}</span>
                <span className={`font-mono text-[10px] tracking-[0.14em] ${user.isNsfw ? "text-accent" : "text-meta-dim"}`}>
                  {user.isNsfw ? "NSFW" : "—"}
                </span>
                <span className={`font-mono text-xs ${user.reportCount > 0 ? "text-accent" : "text-meta-dim"}`}>{user.reportCount}</span>
                <span className="byline text-meta">{formatDate(user.createdAt)}</span>
                <span className="byline text-ink text-right">Open</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer: count + single primary */}
      {!isLoading && users.length > 0 && (
        <div className="flex items-center justify-between gap-4 pt-5">
          <span className="slug text-meta-dim">Showing {users.length} of {users.length}</span>
          <Link
            href="/admin/invites"
            className="bg-accent text-white font-sans font-medium uppercase tracking-[0.16em] text-xs px-6 py-3 hover:opacity-[0.88] transition-opacity"
          >
            Invite a member
          </Link>
        </div>
      )}

      {/* Full member dossier (all actions inside) */}
      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} onChanged={loadUsers} />
      )}
    </div>
  );
}
