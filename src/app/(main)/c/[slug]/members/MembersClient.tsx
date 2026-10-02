"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
  IconCrown,
  IconShield,
} from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import {
  getCommunity,
  listCommunityStaff,
  listCommunityMembersPage,
  type CommunitySummary,
  type CommunityMember,
} from "@/actions/communities";
import { Avatar } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/lib/motion";

const PAGE_SIZE = 50;

/** owner → Editor-in-chief, moderator → Editor, member → Member (app wording). */
function roleLabel(role: CommunityMember["role"]): string {
  if (role === "owner") return "Editor-in-chief";
  if (role === "moderator") return "Editor";
  return "Member";
}

function joinedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function MemberRow({ m }: { m: CommunityMember }) {
  return (
    <Link href={`/profile/${m.username}`} className="flex items-center gap-3 py-4 group">
      <Avatar src={m.avatarUrl} username={m.username} size="md" />
      <div className="flex-1 min-w-0">
        <p className="type-heading text-foreground flex items-center gap-1.5 group-hover:text-vocl-primary transition-colors">
          <span className="truncate">{m.displayName || m.username}</span>
          {m.role === "owner" && <IconCrown size={14} className="text-amber-400 flex-shrink-0" />}
          {m.role === "moderator" && <IconShield size={14} className="text-vocl-primary flex-shrink-0" />}
        </p>
        <p className="type-meta text-foreground/50 truncate">
          @{m.username} · {roleLabel(m.role)}
        </p>
      </div>
      <span className="type-meta text-foreground/40 flex-shrink-0 whitespace-nowrap">
        {joinedLabel(m.joinedAt)}
      </span>
    </Link>
  );
}

export function MembersClient() {
  const params = useParams();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [staff, setStaff] = useState<CommunityMember[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const c = await getCommunity(slug);
      if (!c.success || !c.community) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCommunity(c.community);
      const [s, m] = await Promise.all([
        listCommunityStaff(c.community.id),
        listCommunityMembersPage(c.community.id, { limit: PAGE_SIZE, offset: 0 }),
      ]);
      if (s.success) setStaff(s.members || []);
      if (m.success) {
        setMembers(m.members || []);
        setHasMore(!!m.hasMore);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const loadMore = async () => {
    if (!community || loadingMore) return;
    setLoadingMore(true);
    const m = await listCommunityMembersPage(community.id, {
      limit: PAGE_SIZE,
      offset: members.length,
    });
    if (m.success) {
      setMembers((prev) => [...prev, ...(m.members || [])]);
      setHasMore(!!m.hasMore);
    }
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-primary" />
      </div>
    );
  }

  if (notFound || !community) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center">
        <span className="type-meta uppercase tracking-widest text-foreground/40 font-semibold">
          No such desk
        </span>
        <h1 className="type-display text-foreground mt-1 mb-1">Community not found</h1>
        <Link href="/communities" className="inline-block mt-4 text-sm font-medium text-vocl-primary hover:underline">
          Browse the desks
        </Link>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="py-3 sm:py-6 px-2 sm:px-4 max-w-2xl mx-auto"
        initial="hidden"
        animate="show"
        variants={fadeUp}
      >
        <Link
          href={`/c/${community.slug}`}
          className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-6 transition-colors"
        >
          <IconArrowLeft size={16} />
          Back to the desk
        </Link>

        <header className="mb-5 border-b border-vocl-border pb-5">
          <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
            {community.memberCount.toLocaleString()} {community.memberCount === 1 ? "member" : "members"}
          </span>
          <h1 className="type-display text-foreground truncate">
            Members — {community.name}
          </h1>
        </header>

        {/* Editors + moderators first */}
        {staff.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
                The Editors
              </span>
              <span className="h-px flex-1 bg-vocl-border" />
            </div>
            <motion.div
              className="divide-y divide-vocl-border"
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.04)}
            >
              {staff.map((m) => (
                <motion.div key={m.userId} variants={fadeUp}>
                  <MemberRow m={m} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* Everyone else, newest first */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
              Members
            </span>
            <span className="h-px flex-1 bg-vocl-border" />
          </div>
          {members.length === 0 ? (
            <p className="type-body text-foreground/45 py-2">No members yet.</p>
          ) : (
            <motion.div
              className="divide-y divide-vocl-border"
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.03)}
            >
              {members.map((m) => (
                <motion.div key={m.userId} variants={fadeUp}>
                  <MemberRow m={m} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {hasMore && (
            <div className="pt-6 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 text-sm font-medium text-vocl-primary hover:underline disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" /> Loading…
                  </>
                ) : (
                  "Load more members →"
                )}
              </button>
            </div>
          )}
        </section>
      </motion.div>
    </MotionConfig>
  );
}
