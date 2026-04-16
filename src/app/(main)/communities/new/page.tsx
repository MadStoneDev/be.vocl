"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import { createCommunity } from "@/actions/communities";
import { toast } from "@/components/ui";

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
    <div className="py-6 px-4 max-w-xl mx-auto">
      <title>New community | be.vocl</title>
      <Link
        href="/communities"
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to communities
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-2">Create a community</h1>
      <p className="text-sm text-foreground/60 mb-6">
        A space for people who share an interest. You'll be the owner.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Photography Enthusiasts"
            className="w-full px-3 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent text-sm"
            required
            minLength={2}
            maxLength={60}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            URL (slug)
          </label>
          <div className="flex items-stretch rounded-xl bg-vocl-surface-dark border border-white/10 focus-within:ring-2 focus-within:ring-vocl-accent focus-within:border-transparent overflow-hidden">
            <span className="px-3 py-2.5 text-sm text-foreground/40 bg-white/[0.03] border-r border-white/10">
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
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">
            Description <span className="text-foreground/40">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this community about?"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent text-sm resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={nsfw}
            onClick={() => setNsfw(!nsfw)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              nsfw ? "bg-rose-500" : "bg-white/10"
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
          className="w-full py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <IconLoader2 size={18} className="animate-spin mx-auto" />
          ) : (
            "Create community"
          )}
        </button>
      </form>
    </div>
  );
}
