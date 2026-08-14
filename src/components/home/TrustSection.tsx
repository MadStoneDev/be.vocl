import {
  IconMask,
  IconAdjustmentsHorizontal,
  IconShieldLock,
  IconShieldHeart,
} from "@tabler/icons-react";

/** The differentiator. Honest framing: pseudonymous + you control visibility +
 *  we don't monetise you — NOT "everything is private" (posts are opt-out public). */
const PROMISES = [
  {
    icon: IconMask,
    title: "Write under a pen name",
    body: "You don't owe anyone your real name. Post under a pseudonym and keep your identity yours — no real-name policing.",
  },
  {
    icon: IconAdjustmentsHorizontal,
    title: "You decide who sees it",
    body: "Set each post to public, followers-only, or private. Anything marked mature is never shown publicly — that's a hard rule, not a setting.",
  },
  {
    icon: IconShieldLock,
    title: "We don't sell you",
    body: "No ad-tech, no data brokers, no feed tuned to keep you angry. Your words aren't a product and your attention isn't for sale.",
  },
  {
    icon: IconShieldHeart,
    title: "Vent freely, stay safe",
    body: "Block, mute and report that actually work, backed by real moderation. Freedom to say the hard thing — not a free-for-all.",
  },
] as const;

export function TrustSection() {
  return (
    <section className="border-t border-vocl-border bg-vocl-hover/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
            Why be.vocl
          </span>
          <h2 className="mt-3 type-display text-3xl font-bold text-foreground sm:text-4xl">
            A place to be honest, without looking over your shoulder.
          </h2>
          <p className="mt-4 type-body text-foreground/65 sm:text-lg">
            Somewhere to write, vent and share what you actually think — with the
            controls to decide exactly who gets to see it.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-vocl-border bg-background p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-vocl-primary/10 text-vocl-primary">
                <Icon size={22} stroke={1.75} />
              </span>
              <h3 className="mt-4 type-display text-lg font-bold text-foreground">
                {title}
              </h3>
              <p className="mt-2 type-body text-sm text-foreground/65">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
