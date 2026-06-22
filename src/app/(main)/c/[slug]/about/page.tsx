"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  IconArrowLeft,
  IconLoader2,
  IconCrown,
  IconShield,
} from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import {
  getCommunity,
  listCommunityMembers,
  listCommunityRules,
  type CommunitySummary,
  type CommunityMember,
  type CommunityRule,
} from "@/actions/communities";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function CommunityAboutPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [m, r] = await Promise.all([
        listCommunityMembers(c.community.id, { limit: 50 }),
        listCommunityRules(c.community.id),
      ]);
      if (m.success) setMembers(m.members || []);
      if (r.success) setRules(r.rules || []);
      setLoading(false);
    };
    load();
  }, [slug]);

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

  const moderators = members.filter((m) => m.role === "owner" || m.role === "moderator");

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      className="py-3 sm:py-6 px-2 sm:px-4 max-w-2xl mx-auto"
      initial="hidden"
      animate="show"
      variants={fadeUp}
    >
      {community && <title>{`About — ${community.name} | be.vocl`}</title>}
      <Link
        href={`/c/${community.slug}`}
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-6 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to the desk
      </Link>

      {/* Section masthead */}
      <header className="flex items-center gap-3 mb-5 border-b border-vocl-border pb-5">
        <div className="w-14 h-14 rounded-xl bg-vocl-surface-dark border border-vocl-border overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0">
          {community.iconUrl ? (
            <Image src={community.iconUrl} alt="" width={56} height={56} className="object-cover" />
          ) : (
            <span className="text-xl bg-gradient-to-br from-vocl-primary to-vocl-primary-hover w-full h-full flex items-center justify-center font-display">
              {community.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
            About the Desk
          </span>
          <h1 className="type-display text-foreground truncate">{community.name}</h1>
          <p className="type-meta text-foreground/40">/c/{community.slug}</p>
        </div>
      </header>

      {community.description && (
        <p className="type-body text-foreground/80 mb-7">{community.description}</p>
      )}

      {/* Masthead stats — hairline columns */}
      <div className="grid grid-cols-3 border-y border-vocl-border divide-x divide-vocl-border mb-9">
        <div className="py-4 text-center">
          <p className="type-display text-foreground leading-none">{community.memberCount.toLocaleString()}</p>
          <p className="type-meta uppercase tracking-widest text-foreground/45 mt-1.5">Members</p>
        </div>
        <div className="py-4 text-center">
          <p className="type-display text-foreground leading-none">{community.postCount.toLocaleString()}</p>
          <p className="type-meta uppercase tracking-widest text-foreground/45 mt-1.5">Posts</p>
        </div>
        <div className="py-4 text-center">
          <p className="type-heading text-foreground leading-none">
            {new Date(community.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
          </p>
          <p className="type-meta uppercase tracking-widest text-foreground/45 mt-1.5">Founded</p>
        </div>
      </div>

      {/* Rules */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">Rules</span>
          <span className="h-px flex-1 bg-vocl-border" />
        </div>
        {rules.length === 0 ? (
          <p className="type-body text-foreground/45 py-2">No rules set.</p>
        ) : (
          <ol className="divide-y divide-vocl-border border-t border-vocl-border">
            {rules.map((r, idx) => (
              <li key={r.id} className="flex gap-4 py-4">
                <span className="type-display text-vocl-primary leading-none flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="type-heading text-foreground">{r.title}</p>
                  {r.body && <p className="type-body text-foreground/65 mt-1 whitespace-pre-wrap">{r.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Mods */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">The Editors</span>
          <span className="h-px flex-1 bg-vocl-border" />
        </div>
        <motion.div
          className="divide-y divide-vocl-border border-t border-vocl-border"
          initial="hidden"
          animate="show"
          variants={staggerContainer(0.04)}
        >
          {moderators.map((m) => (
            <motion.div key={m.userId} variants={fadeUp}>
              <Link
                href={`/profile/${m.username}`}
                className="flex items-center gap-3 py-4 group"
              >
                <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                  {m.avatarUrl ? (
                    <Image src={m.avatarUrl} alt={m.username} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center text-white font-bold">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="type-heading text-foreground flex items-center gap-1.5 group-hover:text-vocl-primary transition-colors">
                    {m.displayName || m.username}
                    {m.role === "owner" ? (
                      <IconCrown size={14} className="text-amber-400" />
                    ) : (
                      <IconShield size={14} className="text-vocl-primary" />
                    )}
                  </p>
                  <p className="type-meta text-foreground/50">
                    @{m.username} · {m.role === "owner" ? "Editor-in-chief" : "Editor"}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </motion.div>
    </MotionConfig>
  );
}
