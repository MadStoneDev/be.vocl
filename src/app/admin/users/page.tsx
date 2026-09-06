"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  IconLoader2,
  IconSearch,
  IconLock,
  IconLockOpen,
  IconBan,
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui";
import { getUsers, type UserWithDetails } from "@/actions/admin";
import { UserDetailModal } from "@/components/admin/UserDetailModal";

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const th = "text-left px-4 py-3 type-meta font-semibold text-foreground/50";

  return (
    <div>
      <title>Admin — Users | be.vocl</title>
      <div className="flex items-center justify-between mb-6">
        <h1 className="type-display text-2xl font-bold text-foreground">Users</h1>
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
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-vocl-surface-dark border border-vocl-border text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-vocl-surface-dark border border-vocl-border text-foreground focus:outline-none focus:border-vocl-primary"
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
          <IconLoader2 size={32} className="animate-spin text-vocl-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/50">No users found</p>
        </div>
      ) : (
        <div className="bg-vocl-surface-dark rounded-sm border border-vocl-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-vocl-border">
                <th className={th}>User</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th}>NSFW</th>
                <th className={th}>Beta</th>
                <th className={th}>Reports</th>
                <th className={th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className="border-b border-vocl-border last:border-0 cursor-pointer hover:bg-vocl-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatarUrl} username={user.username} size="sm" />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          @{user.username}
                        </div>
                        {user.displayName && (
                          <div className="type-meta text-foreground/50 truncate">
                            {user.displayName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="type-meta font-semibold text-foreground/70">
                      {ROLE_LABELS[user.role] ?? `Role ${user.role}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full type-meta font-semibold ${
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
                      {user.lockStatus === "unlocked" ? "active" : user.lockStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isNsfw ? (
                      <span className="inline-block px-2 py-0.5 rounded-full type-meta font-semibold bg-rose-500/20 text-rose-400">
                        NSFW
                      </span>
                    ) : (
                      <span className="type-meta text-foreground/25">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.betaAccess ? (
                      <span className="inline-block px-2 py-0.5 rounded-full type-meta font-semibold bg-vocl-primary/20 text-vocl-primary">
                        BETA
                      </span>
                    ) : (
                      <span className="type-meta text-foreground/25">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.reportCount > 0 ? (
                      <span className="type-meta font-semibold text-amber-500">
                        {user.reportCount}
                      </span>
                    ) : (
                      <span className="type-meta text-foreground/30">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 type-meta text-foreground/50 whitespace-nowrap">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onChanged={loadUsers}
        />
      )}
    </div>
  );
}
