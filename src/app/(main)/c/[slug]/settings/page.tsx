"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  IconArrowLeft,
  IconLoader2,
  IconTrash,
  IconCheck,
  IconX,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconCrown,
  IconShield,
  IconUser,
} from "@tabler/icons-react";
import {
  getCommunity,
  updateCommunity,
  deleteCommunity,
  listCommunityMembers,
  changeMemberRole,
  removeMember,
  listJoinRequests,
  reviewJoinRequest,
  listCommunityRules,
  upsertCommunityRule,
  deleteCommunityRule,
  type CommunitySummary,
  type CommunityMember,
  type CommunityRule,
  type JoinRequest,
} from "@/actions/communities";
import { motion, MotionConfig } from "framer-motion";
import { toast } from "@/components/ui";
import { fadeUp } from "@/lib/motion";

export default function CommunitySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  // editable
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [nsfw, setNsfw] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "restricted" | "private">("public");
  const [joinPolicy, setJoinPolicy] = useState<"open" | "request" | "invite_only">("open");
  const [savingMain, setSavingMain] = useState(false);

  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const c = await getCommunity(slug);
    if (!c.success || !c.community) {
      setLoading(false);
      setDenied(true);
      return;
    }
    if (c.community.myRole !== "owner" && c.community.myRole !== "moderator") {
      setLoading(false);
      setDenied(true);
      return;
    }

    setCommunity(c.community);
    setName(c.community.name);
    setDescription(c.community.description || "");
    setIconUrl(c.community.iconUrl || "");
    setBannerUrl(c.community.bannerUrl || "");
    setNsfw(c.community.nsfw);
    setVisibility(c.community.visibility);
    setJoinPolicy(c.community.joinPolicy);

    const [m, r, ru] = await Promise.all([
      listCommunityMembers(c.community.id, { limit: 100 }),
      listJoinRequests(c.community.id, "pending"),
      listCommunityRules(c.community.id),
    ]);
    if (m.success) setMembers(m.members || []);
    if (r.success) setRequests(r.requests || []);
    if (ru.success) setRules(ru.rules || []);

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSaveMain = async () => {
    if (!community || savingMain) return;
    setSavingMain(true);
    const result = await updateCommunity(community.id, {
      name,
      description,
      iconUrl: iconUrl || null,
      bannerUrl: bannerUrl || null,
      nsfw,
      visibility,
      joinPolicy,
    });
    if (result.success) toast.success("Saved");
    else toast.error(result.error || "Failed to save");
    setSavingMain(false);
  };

  const handleDelete = async () => {
    if (!community) return;
    if (deleteText !== community.slug) {
      toast.error(`Type ${community.slug} to confirm`);
      return;
    }
    const result = await deleteCommunity(community.id);
    if (result.success) {
      toast.success("Community deleted");
      router.push("/communities");
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  const handleReviewRequest = async (id: string, decision: "approved" | "rejected") => {
    setBusy((b) => ({ ...b, [id]: true }));
    const result = await reviewJoinRequest(id, decision);
    if (result.success) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(decision === "approved" ? "Approved" : "Rejected");
    } else {
      toast.error(result.error || "Failed");
    }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const handleChangeRole = async (userId: string, role: "member" | "moderator" | "owner") => {
    if (!community) return;
    setBusy((b) => ({ ...b, [`role-${userId}`]: true }));
    const result = await changeMemberRole(community.id, userId, role);
    if (result.success) {
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
      toast.success("Role updated");
    } else {
      toast.error(result.error || "Failed");
    }
    setBusy((b) => ({ ...b, [`role-${userId}`]: false }));
  };

  const handleRemoveMember = async (userId: string) => {
    if (!community) return;
    if (!confirm("Remove this member?")) return;
    setBusy((b) => ({ ...b, [`remove-${userId}`]: true }));
    const result = await removeMember(community.id, userId);
    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Member removed");
    } else {
      toast.error(result.error || "Failed");
    }
    setBusy((b) => ({ ...b, [`remove-${userId}`]: false }));
  };

  const handleAddRule = async () => {
    if (!community) return;
    const nextPos = (rules[rules.length - 1]?.position ?? -1) + 1;
    const result = await upsertCommunityRule(community.id, {
      position: nextPos,
      title: "New rule",
      body: "",
    });
    if (result.success && result.id) {
      setRules((prev) => [...prev, { id: result.id!, position: nextPos, title: "New rule", body: "" }]);
    } else {
      toast.error(result.error || "Failed");
    }
  };

  const handleSaveRule = async (rule: CommunityRule) => {
    if (!community) return;
    setBusy((b) => ({ ...b, [`rule-${rule.id}`]: true }));
    const result = await upsertCommunityRule(community.id, rule);
    if (result.success) toast.success("Rule saved");
    else toast.error(result.error || "Failed");
    setBusy((b) => ({ ...b, [`rule-${rule.id}`]: false }));
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Delete this rule?")) return;
    const result = await deleteCommunityRule(ruleId);
    if (result.success) setRules((prev) => prev.filter((r) => r.id !== ruleId));
    else toast.error(result.error || "Failed");
  };

  const moveRule = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= rules.length) return;
    const next = [...rules];
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((r, i) => (r.position = i));
    setRules(next);
    if (community) {
      await Promise.all(next.map((r) => upsertCommunityRule(community.id, r)));
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-primary" />
      </div>
    );
  }

  if (denied || !community) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center">
        <span className="type-meta uppercase tracking-widest text-foreground/40 font-semibold">
          Restricted
        </span>
        <h1 className="type-display text-foreground mt-1 mb-1">Access denied</h1>
        <p className="type-body text-foreground/50">You need to be a moderator or owner to access settings.</p>
        <Link href={`/c/${slug}`} className="inline-block mt-4 text-sm font-medium text-vocl-primary hover:underline">
          Back to the desk
        </Link>
      </div>
    );
  }

  const isOwner = community.myRole === "owner";

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      className="py-3 sm:py-6 px-2 sm:px-4 max-w-2xl mx-auto"
      initial="hidden"
      animate="show"
      variants={fadeUp}
    >
      {community && <title>{`Settings — ${community.name} | be.vocl`}</title>}
      <Link
        href={`/c/${community.slug}`}
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-6 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to the desk
      </Link>

      <header className="mb-8 border-b border-vocl-border pb-5">
        <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
          The Masthead
        </span>
        <h1 className="type-display-lg text-foreground mt-1">Desk settings</h1>
        <p className="type-meta text-foreground/50 mt-1">
          /c/{community.slug} · {community.myRole}
        </p>
      </header>

      {/* Main info */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">General</span>
          <span className="h-px flex-1 bg-vocl-border" />
        </div>
        <div className="space-y-4 p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
          <div>
            <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full px-3 py-2 rounded-sm bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 rounded-sm bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-1.5">Icon URL</label>
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-sm bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-1.5">Banner URL</label>
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-sm bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-1.5">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full px-3 py-2 rounded-sm bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent"
              >
                <option value="public">Public — anyone can view</option>
                <option value="restricted">Restricted — anyone can view, members post</option>
                <option value="private">Private — members only</option>
              </select>
            </div>
            <div>
              <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-1.5">Join policy</label>
              <select
                value={joinPolicy}
                onChange={(e) => setJoinPolicy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-sm bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:border-transparent"
              >
                <option value="open">Open — anyone can join</option>
                <option value="request">Request — requires approval</option>
                <option value="invite_only">Invite only — admins approve</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={nsfw}
              onClick={() => setNsfw(!nsfw)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                nsfw ? "bg-rose-500" : "bg-vocl-hover-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  nsfw ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-foreground">Mark community as NSFW</span>
          </label>

          <button
            onClick={handleSaveMain}
            disabled={savingMain}
            className="w-full sm:w-auto px-5 py-2 rounded-full bg-vocl-primary text-white text-sm font-medium hover:bg-vocl-primary-hover transition-colors disabled:opacity-50"
          >
            {savingMain ? <IconLoader2 size={16} className="animate-spin mx-auto" /> : "Save changes"}
          </button>
        </div>
      </section>

      {/* Join requests */}
      {(community.joinPolicy === "request" || community.joinPolicy === "invite_only") && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
              Pending join requests {requests.length > 0 && <span className="text-foreground/35">({requests.length})</span>}
            </span>
            <span className="h-px flex-1 bg-vocl-border" />
          </div>
          {requests.length === 0 ? (
            <div className="rounded-sm bg-vocl-hover border border-vocl-border p-6 text-center">
              <p className="text-sm text-foreground/50">No pending requests.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-sm bg-vocl-surface-dark border border-vocl-border">
                  <Link href={`/profile/${r.username}`} className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {r.avatarUrl ? (
                      <Image src={r.avatarUrl} alt={r.username} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center text-white font-bold">
                        {r.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.displayName || r.username}</p>
                    <p className="text-xs text-foreground/50">@{r.username}</p>
                    {r.message && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{r.message}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleReviewRequest(r.id, "approved")}
                      disabled={busy[r.id]}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      aria-label="Approve"
                    >
                      <IconCheck size={16} />
                    </button>
                    <button
                      onClick={() => handleReviewRequest(r.id, "rejected")}
                      disabled={busy[r.id]}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                      aria-label="Reject"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
            Members <span className="text-foreground/35">({members.length})</span>
          </span>
          <span className="h-px flex-1 bg-vocl-border" />
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 p-3 rounded-sm bg-vocl-surface-dark border border-vocl-border">
              <Link href={`/profile/${m.username}`} className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {m.avatarUrl ? (
                  <Image src={m.avatarUrl} alt={m.username} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center text-white font-bold">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {m.displayName || m.username}
                  {m.role === "owner" && <IconCrown size={14} className="text-amber-400" />}
                  {m.role === "moderator" && <IconShield size={14} className="text-vocl-primary" />}
                </p>
                <p className="text-xs text-foreground/50">@{m.username} • {m.role}</p>
              </div>
              {isOwner && m.role !== "owner" && (
                <div className="flex gap-1.5">
                  {m.role === "member" ? (
                    <button
                      onClick={() => handleChangeRole(m.userId, "moderator")}
                      disabled={busy[`role-${m.userId}`]}
                      className="px-2.5 py-1 rounded-lg bg-vocl-hover text-xs text-foreground/70 hover:bg-vocl-hover-strong"
                    >
                      Make mod
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChangeRole(m.userId, "member")}
                      disabled={busy[`role-${m.userId}`]}
                      className="px-2.5 py-1 rounded-lg bg-vocl-hover text-xs text-foreground/70 hover:bg-vocl-hover-strong"
                    >
                      Demote
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    disabled={busy[`remove-${m.userId}`]}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                    aria-label="Remove"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rules */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">Rules</span>
          <span className="h-px flex-1 bg-vocl-border" />
          <button
            onClick={handleAddRule}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-vocl-primary/15 text-vocl-primary hover:bg-vocl-primary/25 text-xs font-medium flex-shrink-0"
          >
            <IconPlus size={14} /> Add rule
          </button>
        </div>
        {rules.length === 0 ? (
          <div className="rounded-sm bg-vocl-hover border border-vocl-border p-6 text-center">
            <p className="text-sm text-foreground/50">No rules yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div key={rule.id} className="p-3 rounded-sm bg-vocl-surface-dark border border-vocl-border space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col">
                    <button onClick={() => moveRule(idx, -1)} disabled={idx === 0} className="text-foreground/40 hover:text-foreground disabled:opacity-30">
                      <IconChevronUp size={16} />
                    </button>
                    <button onClick={() => moveRule(idx, 1)} disabled={idx === rules.length - 1} className="text-foreground/40 hover:text-foreground disabled:opacity-30">
                      <IconChevronDown size={16} />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={rule.title}
                      onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, title: e.target.value } : r)))}
                      maxLength={120}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary"
                    />
                    <textarea
                      value={rule.body || ""}
                      onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, body: e.target.value } : r)))}
                      placeholder="Explain the rule (optional)"
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background/50 border border-vocl-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-vocl-primary resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveRule(rule)}
                        disabled={busy[`rule-${rule.id}`]}
                        className="px-2.5 py-1 rounded-lg bg-vocl-primary text-white text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <span className="type-meta uppercase tracking-widest text-rose-400 font-semibold">Danger zone</span>
            <span className="h-px flex-1 bg-rose-500/20" />
          </div>
          <div className="p-4 rounded-sm bg-rose-500/5 border border-rose-500/20 space-y-3">
            <p className="text-sm text-foreground/70">
              Deleting this community removes all members, posts, and rules. This cannot be undone.
            </p>
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-foreground/60">
                  Type <span className="font-mono text-rose-400">{community.slug}</span> to confirm.
                </p>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm bg-background/50 border border-rose-500/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteText !== community.slug}
                    className="px-3 py-2 rounded-sm bg-rose-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Delete forever
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteText("");
                    }}
                    className="px-3 py-2 rounded-sm bg-vocl-hover-strong text-foreground text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/30"
              >
                <IconTrash size={14} /> Delete community
              </button>
            )}
          </div>
        </section>
      )}
    </motion.div>
    </MotionConfig>
  );
}
