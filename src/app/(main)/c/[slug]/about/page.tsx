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
  IconUser,
  IconNotes,
  IconCalendar,
} from "@tabler/icons-react";
import {
  getCommunity,
  listCommunityMembers,
  listCommunityRules,
  type CommunitySummary,
  type CommunityMember,
  type CommunityRule,
} from "@/actions/communities";

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
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  if (notFound || !community) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-foreground mb-1">Community not found</h1>
        <Link href="/communities" className="inline-block mt-4 text-sm text-vocl-accent hover:underline">
          Browse communities
        </Link>
      </div>
    );
  }

  const moderators = members.filter((m) => m.role === "owner" || m.role === "moderator");

  return (
    <div className="py-6 px-4 max-w-2xl mx-auto">
      {community && <title>{`About — ${community.name} | be.vocl`}</title>}
      <Link
        href={`/c/${community.slug}`}
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to community
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-vocl-surface-dark overflow-hidden flex items-center justify-center text-white font-bold">
          {community.iconUrl ? (
            <Image src={community.iconUrl} alt="" width={48} height={48} className="object-cover" />
          ) : (
            <span className="bg-gradient-to-br from-vocl-accent to-vocl-accent-hover w-full h-full flex items-center justify-center">
              {community.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{community.name}</h1>
          <p className="text-xs text-foreground/50">/c/{community.slug}</p>
        </div>
      </div>

      {community.description && (
        <p className="text-sm text-foreground/80 mb-6">{community.description}</p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-3 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <IconUser size={18} className="text-vocl-accent mx-auto mb-1" />
          <p className="text-base font-bold text-foreground">{community.memberCount.toLocaleString()}</p>
          <p className="text-xs text-foreground/50">Members</p>
        </div>
        <div className="p-3 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <IconNotes size={18} className="text-vocl-accent mx-auto mb-1" />
          <p className="text-base font-bold text-foreground">{community.postCount.toLocaleString()}</p>
          <p className="text-xs text-foreground/50">Posts</p>
        </div>
        <div className="p-3 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <IconCalendar size={18} className="text-vocl-accent mx-auto mb-1" />
          <p className="text-xs font-bold text-foreground">
            {new Date(community.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
          </p>
          <p className="text-xs text-foreground/50">Created</p>
        </div>
      </div>

      {/* Rules */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Rules</h2>
        {rules.length === 0 ? (
          <div className="rounded-xl bg-white/5 border border-white/5 p-6 text-center">
            <p className="text-sm text-foreground/50">No rules set.</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {rules.map((r, idx) => (
              <li key={r.id} className="flex gap-3 p-3 rounded-xl bg-vocl-surface-dark border border-white/5">
                <span className="text-vocl-accent font-mono text-sm font-semibold flex-shrink-0">
                  {idx + 1}.
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  {r.body && <p className="text-xs text-foreground/70 mt-1 whitespace-pre-wrap">{r.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Mods */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Moderators</h2>
        <div className="space-y-2">
          {moderators.map((m) => (
            <Link
              key={m.userId}
              href={`/profile/${m.username}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-vocl-surface-dark border border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {m.avatarUrl ? (
                  <Image src={m.avatarUrl} alt={m.username} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center text-white font-bold">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {m.displayName || m.username}
                  {m.role === "owner" ? (
                    <IconCrown size={14} className="text-amber-400" />
                  ) : (
                    <IconShield size={14} className="text-vocl-accent" />
                  )}
                </p>
                <p className="text-xs text-foreground/50">@{m.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
