"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconPlus,
  IconSearch,
  IconLoader2,
  IconCheck,
  IconUser,
  IconNotes,
} from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import { listCommunities, joinCommunity, leaveCommunity, type CommunitySummary } from "@/actions/communities";
import { toast } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/lib/motion";

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
    <MotionConfig reducedMotion="user">
      <div className="py-3 sm:py-6 px-2 sm:px-4 max-w-3xl mx-auto">
        <title>Communities | be.vocl</title>

        {/* Editorial masthead */}
        <motion.header
          className="mb-6 border-b border-vocl-border pb-5"
          initial="hidden"
          animate="show"
          variants={fadeUp}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
                The Desks
              </span>
              <h1 className="type-display-lg text-foreground mt-1">Communities</h1>
              <p className="type-body text-foreground/55 mt-1">
                Sections of the publication, gathered around a shared subject.
              </p>
            </div>
            <Link
              href="/communities/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-vocl-primary text-white text-sm font-medium hover:bg-vocl-primary-hover transition-colors flex-shrink-0"
            >
              <IconPlus size={16} />
              New desk
            </Link>
          </div>
        </motion.header>

        {/* Text tabs with thin underline */}
        <div className="flex items-center gap-6 mb-5 border-b border-vocl-border">
          {(["discover", "joined"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px pb-2.5 type-meta uppercase tracking-widest font-semibold transition-colors ${
                tab === t
                  ? "text-foreground"
                  : "text-foreground/45 hover:text-foreground/70"
              }`}
            >
              {t}
              {tab === t && (
                <motion.span
                  layoutId="communities-tab-underline"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-vocl-primary"
                />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the desks..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-vocl-surface-dark border border-vocl-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent text-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <IconLoader2 size={28} className="animate-spin text-vocl-primary" />
          </div>
        ) : communities.length === 0 ? (
          <div className="border-t border-vocl-border py-16 text-center">
            <p className="type-body text-foreground/50">
              {tab === "joined"
                ? "You haven't joined any desks yet."
                : search
                  ? "No desks match your search."
                  : "No desks yet — be the first to open one."}
            </p>
          </div>
        ) : (
          <motion.div
            className="divide-y divide-vocl-border border-t border-vocl-border"
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.04)}
          >
            {communities.map((c) => (
              <motion.article
                key={c.id}
                variants={fadeUp}
                className="flex items-center gap-4 py-5"
              >
                <Link
                  href={`/c/${c.slug}`}
                  className="w-14 h-14 rounded-xl bg-vocl-surface-dark border border-vocl-border overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
                >
                  {c.iconUrl ? (
                    <Image src={c.iconUrl} alt="" width={56} height={56} className="object-cover" />
                  ) : (
                    <span className="text-xl bg-gradient-to-br from-vocl-primary to-vocl-primary-hover w-full h-full flex items-center justify-center font-display">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>

                <Link href={`/c/${c.slug}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-2">
                    <span className="type-meta uppercase tracking-widest text-foreground/40">
                      /c/{c.slug}
                    </span>
                    {c.nsfw && (
                      <span className="type-meta uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400">
                        NSFW
                      </span>
                    )}
                  </div>
                  <p className="type-heading text-foreground truncate group-hover:text-vocl-primary transition-colors">
                    {c.name}
                  </p>
                  {c.description && (
                    <p className="type-body text-foreground/60 mt-0.5 line-clamp-1">
                      {c.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-1.5 type-meta text-foreground/40">
                    <span className="flex items-center gap-1">
                      <IconUser size={12} />
                      {c.memberCount.toLocaleString()} {c.memberCount === 1 ? "member" : "members"}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconNotes size={12} />
                      {c.postCount.toLocaleString()} {c.postCount === 1 ? "post" : "posts"}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => handleToggleJoin(c)}
                  disabled={busy[c.id]}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                    c.isMember
                      ? "border border-vocl-border text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
                      : "bg-vocl-primary text-white hover:bg-vocl-primary-hover"
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
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
