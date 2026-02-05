"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  IconLoader2,
  IconSearch,
  IconShieldCheck,
  IconLock,
  IconLockOpen,
  IconBan,
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui";
import {
  getUsers,
  banUser,
  restrictUser,
  unlockUser,
  setUserRole,
  type UserWithDetails,
} from "@/actions/admin";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unlocked", label: "Active" },
  { value: "restricted", label: "Restricted" },
  { value: "banned", label: "Banned" },
];

const ROLE_LABELS: Record<number, string> = {
  0: "User",
  5: "Moderator",
  10: "Admin",
};

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
    if (result.success && result.users) {
      setUsers(result.users);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
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

  const handleRestrict = async (userId: string) => {
    setActionLoading(true);
    await restrictUser(userId);
    loadUsers();
    setActionLoading(false);
  };

  const handleUnlock = async (userId: string) => {
    setActionLoading(true);
    await unlockUser(userId);
    loadUsers();
    setActionLoading(false);
  };

  const handleSetRole = async (userId: string, role: number) => {
    setActionLoading(true);
    await setUserRole(userId, role);
    loadUsers();
    setActionLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent"
          />
        </div>
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
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/50">No users found</p>
        </div>
      ) : (
        <div className="bg-vocl-surface-dark rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                  User
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                  Reports
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground/50">
                  Joined
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-foreground/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.avatarUrl}
                        username={user.username}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium text-foreground">
                          @{user.username}
                        </div>
                        {user.displayName && (
                          <div className="text-xs text-foreground/50">
                            {user.displayName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleSetRole(user.id, Number(e.target.value))}
                      disabled={actionLoading}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none"
                    >
                      <option value={0}>User</option>
                      <option value={5}>Moderator</option>
                      <option value={10}>Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.lockStatus === "banned"
                          ? "bg-vocl-like/20 text-vocl-like"
                          : user.lockStatus === "restricted"
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-green-500/20 text-green-500"
                      }`}
                    >
                      {user.lockStatus === "banned" ? (
                        <IconBan size={12} />
                      ) : user.lockStatus === "restricted" ? (
                        <IconLock size={12} />
                      ) : (
                        <IconLockOpen size={12} />
                      )}
                      {user.lockStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.reportCount > 0 ? (
                      <span className="text-amber-500 font-medium">
                        {user.reportCount}
                      </span>
                    ) : (
                      <span className="text-foreground/30">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/50">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.lockStatus === "unlocked" && (
                        <>
                          <button
                            onClick={() => handleRestrict(user.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            Restrict
                          </button>
                          <button
                            onClick={() => setSelectedUser(user)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-vocl-like bg-vocl-like/10 rounded-lg hover:bg-vocl-like/20 disabled:opacity-50"
                          >
                            Ban
                          </button>
                        </>
                      )}
                      {user.lockStatus === "restricted" && (
                        <>
                          <button
                            onClick={() => handleUnlock(user.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-green-500 bg-green-500/10 rounded-lg hover:bg-green-500/20 disabled:opacity-50"
                          >
                            Unlock
                          </button>
                          <button
                            onClick={() => setSelectedUser(user)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-vocl-like bg-vocl-like/10 rounded-lg hover:bg-vocl-like/20 disabled:opacity-50"
                          >
                            Ban
                          </button>
                        </>
                      )}
                      {user.lockStatus === "banned" && (
                        <button
                          onClick={() => handleUnlock(user.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 text-xs font-medium text-green-500 bg-green-500/10 rounded-lg hover:bg-green-500/20 disabled:opacity-50"
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ban Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative w-full max-w-md mx-4 bg-background border border-white/10 rounded-2xl shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Ban @{selectedUser.username}
              </h2>

              <div className="mb-4">
                <label className="text-sm text-foreground/50 block mb-2">
                  Ban Reason (required)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Provide a reason for banning this user..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-foreground hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBan}
                  disabled={actionLoading || !banReason.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-vocl-like text-white font-medium hover:bg-vocl-like/90 disabled:opacity-50"
                >
                  {actionLoading ? "Banning..." : "Ban User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
