"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import { createCommunity } from "@/actions/communities";
import { toast } from "@/components/ui";
import { fadeUp } from "@/lib/motion";

export default function NewCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [nsfw, setNsfw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const autoSlug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(v));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await createCommunity({
      name,
      slug,
      description: description || undefined,
      nsfw,
    });
    if (result.success && result.community) {
      toast.success("Community created");
      router.push(`/c/${result.community.slug}`);
    } else {
      toast.error(result.error || "Failed to create community");
      setSubmitting(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      className="py-3 sm:py-6 px-2 sm:px-4 max-w-xl mx-auto"
      initial="hidden"
      animate="show"
      variants={fadeUp}
    >
      <title>New community | be.vocl</title>
      <Link
        href="/communities"
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-6 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to the desks
      </Link>

      <header className="mb-7 border-b border-vocl-border pb-5">
        <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
          Open a Desk
        </span>
        <h1 className="type-display-lg text-foreground mt-1">Start a community</h1>
        <p className="type-body text-foreground/55 mt-1">
          A section for people who share an interest. You'll be the owner.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-2">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Photography Enthusiasts"
            className="w-full px-3 py-2.5 rounded-xl bg-vocl-surface-dark border border-vocl-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent text-sm"
            required
            minLength={2}
            maxLength={60}
          />
        </div>

        <div>
          <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-2">
            URL (slug)
          </label>
          <div className="flex items-stretch rounded-xl bg-vocl-surface-dark border border-vocl-border focus-within:ring-2 focus-within:ring-vocl-accent focus-within:border-transparent overflow-hidden">
            <span className="px-3 py-2.5 text-sm text-foreground/40 bg-vocl-hover border-r border-vocl-border">
              /c/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(autoSlug(e.target.value))}
              placeholder="photography"
              className="flex-1 px-3 py-2.5 bg-transparent text-foreground placeholder:text-foreground/40 focus:outline-none text-sm"
              required
              pattern="[a-z0-9][a-z0-9_-]{2,31}"
              title="3–32 chars, lowercase letters, numbers, - or _"
            />
          </div>
          <p className="text-xs text-foreground/40 mt-1">
            3–32 characters. Letters, numbers, hyphens, underscores. Cannot be changed.
          </p>
        </div>

        <div>
          <label className="block type-meta uppercase tracking-widest text-foreground/55 font-semibold mb-2">
            Description <span className="text-foreground/40">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this community about?"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-xl bg-vocl-surface-dark border border-vocl-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent text-sm resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
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
          <div>
            <p className="text-sm font-medium text-foreground">NSFW community</p>
            <p className="text-xs text-foreground/50">
              Mark this community as containing adult content
            </p>
          </div>
        </label>

        <button
          type="submit"
          disabled={submitting || !name || !slug}
          className="w-full py-2.5 rounded-full bg-vocl-primary text-white font-medium hover:bg-vocl-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <IconLoader2 size={18} className="animate-spin mx-auto" />
          ) : (
            "Create community"
          )}
        </button>
      </form>
    </motion.div>
    </MotionConfig>
  );
}
