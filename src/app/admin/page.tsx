"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconFlag,
  IconFlagExclamation,
  IconUsers,
  IconMessageReport,
  IconUserX,
  IconLoader2,
  IconAlertTriangle,
  IconTicket,
} from "@tabler/icons-react";
import { getAdminStats } from "@/actions/admin";
import { adminGetInviteStats } from "@/actions/invites";

interface Stats {
  pendingReports: number;
  pendingFlags: number;
  pendingAppeals: number;
  escalatedItems: number;
  bannedUsers: number;
  restrictedUsers: number;
  activeInviteCodes: number;
  totalInviteUses: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const [adminResult, inviteResult] = await Promise.all([
        getAdminStats(),
        adminGetInviteStats(),
      ]);

      if (adminResult.success && adminResult.stats) {
        setStats({
          ...adminResult.stats,
          activeInviteCodes: inviteResult.stats?.activeCodes || 0,
          totalInviteUses: inviteResult.stats?.totalUses || 0,
        });
      }
      setIsLoading(false);
    };

    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Pending Reports",
      value: stats?.pendingReports || 0,
      icon: IconFlag,
      href: "/admin/reports?status=pending",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Pending Flags",
      value: stats?.pendingFlags || 0,
      icon: IconFlagExclamation,
      href: "/admin/flags?status=pending",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Escalated",
      value: stats?.escalatedItems || 0,
      icon: IconAlertTriangle,
      href: "/admin/reports?status=escalated",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Pending Appeals",
      value: stats?.pendingAppeals || 0,
      icon: IconMessageReport,
      href: "/admin/appeals?status=pending",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Banned Users",
      value: stats?.bannedUsers || 0,
      icon: IconUserX,
      href: "/admin/users?status=banned",
      color: "text-vocl-like",
      bgColor: "bg-vocl-like/10",
    },
    {
      label: "Restricted Users",
      value: stats?.restrictedUsers || 0,
      icon: IconUsers,
      href: "/admin/users?status=restricted",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Active Invite Codes",
      value: stats?.activeInviteCodes || 0,
      icon: IconTicket,
      href: "/admin/invites",
      color: "text-vocl-accent",
      bgColor: "bg-vocl-accent/10",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-vocl-surface-dark rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-foreground/50">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-vocl-surface-dark rounded-2xl p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/admin/reports?status=pending"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <IconFlag size={20} className="text-amber-500" />
            <span className="text-foreground">Review reports</span>
          </Link>
          <Link
            href="/admin/flags?status=pending"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <IconFlagExclamation size={20} className="text-orange-500" />
            <span className="text-foreground">Review flags</span>
          </Link>
          <Link
            href="/admin/appeals?status=pending"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <IconMessageReport size={20} className="text-blue-500" />
            <span className="text-foreground">Review appeals</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <IconUsers size={20} className="text-vocl-accent" />
            <span className="text-foreground">Manage users</span>
          </Link>
          <Link
            href="/admin/invites"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <IconTicket size={20} className="text-green-500" />
            <span className="text-foreground">Generate invites</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
