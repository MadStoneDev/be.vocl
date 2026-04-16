"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconUsersGroup,
  IconPlus,
  IconSearch,
  IconLoader2,
  IconCheck,
  IconUser,
  IconNotes,
} from "@tabler/icons-react";
import { listCommunities, joinCommunity, leaveCommunity, type CommunitySummary } from "@/actions/communities";
import { toast } from "@/components/ui";

type Tab = "discover" | "joined";

export default function CommunitiesPage() {
  const [tab, setTab] = useState<Tab>("discover");
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      const result = await listCommunities({
        search: search.trim() || undefined,
        joinedOnly: tab === "joined",
        limit: 50,
      });
      if (cancelled) return;
      if (result.success) setCommunities(result.communities || []);
      else toast.error(result.error || "Failed to load communities");
      setLoading(false);
    };
    const t = setTimeout(run, search ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tab, search]);

  const handleToggleJoin = async (community: CommunitySummary) => {
    setBusy((b) => ({ ...b, [community.id]: true }));
    const result = community.isMember
      ? await leaveCommunity(community.id)
      : await joinCommunity(community.id);
    if (result.success) {
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === community.id
            ? {
                ...c,
                isMember: !community.isMember,
                memberCount: c.memberCount + (community.isMember ? -1 : 1),
              }
            : c
        )
      );
    } else {
      toast.error(result.error || "Action failed");
    }
    setBusy((b) => ({ ...b, [community.id]: false }));
  };

  return (
    <div className="py-6 px-4 max-w-3xl mx-auto">
      <title>Communities | be.vocl</title>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <IconUsersGroup size={26} className="text-vocl-accent" />
            Communities
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Spaces around shared interests
          </p>
        </div>
        <Link
          href="/communities/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vocl-accent text-white text-sm font-medium hover:bg-vocl-accent-hover transition-colors"
        >
          <IconPlus size={16} />
          New
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(["discover", "joined"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-vocl-accent text-white"
                : "bg-white/5 text-foreground/70 hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search communities..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 size={28} className="animate-spin text-vocl-accent" />
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/5 p-10 text-center">
          <p className="text-foreground/50">
            {tab === "joined"
              ? "You haven't joined any communities yet."
              : search
                ? "No communities match your search."
                : "No communities yet — be the first to create one."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {communities.map((c) => (
            <div
              key={c.id}
              className="rounded-xl bg-vocl-surface-dark border border-white/5 hover:border-white/10 transition-colors overflow-hidden"
            >
              <Link href={`/c/${c.slug}`} className="block">
                <div className="h-16 bg-gradient-to-br from-vocl-accent/30 to-vocl-accent-hover/20 relative">
                  {c.bannerUrl && (
                    <Image src={c.bannerUrl} alt="" fill className="object-cover" />
                  )}
                </div>
                <div className="px-4 pt-3 pb-2 -mt-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-vocl-surface-dark border-2 border-vocl-surface-dark overflow-hidden flex items-center justify-center text-white font-bold">
                    {c.iconUrl ? (
                      <Image src={c.iconUrl} alt="" width={48} height={48} className="object-cover" />
                    ) : (
                      <span className="text-lg bg-gradient-to-br from-vocl-accent to-vocl-accent-hover w-full h-full flex items-center justify-center">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{c.name}</p>
                    {c.nsfw && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                        NSFW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/50">/c/{c.slug}</p>
                  {c.description && (
                    <p className="text-sm text-foreground/70 mt-2 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-foreground/50">
                    <span className="flex items-center gap-1">
                      <IconUser size={12} />
                      {c.memberCount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconNotes size={12} />
                      {c.postCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="px-4 pb-3">
                <button
                  onClick={() => handleToggleJoin(c)}
                  disabled={busy[c.id]}
                  className={`w-full py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    c.isMember
                      ? "bg-white/10 text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
                      : "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
                  }`}
                >
                  {busy[c.id] ? (
                    <IconLoader2 size={14} className="animate-spin mx-auto" />
                  ) : c.isMember ? (
                    <span className="inline-flex items-center gap-1 justify-center">
                      <IconCheck size={14} /> Joined
                    </span>
                  ) : (
                    "Join"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
