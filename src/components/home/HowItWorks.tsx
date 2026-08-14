import { IconPencil, IconMessages, IconCompass } from "@tabler/icons-react";

const STEPS = [
  {
    icon: IconPencil,
    title: "Write",
    body: "A sprawling essay or a one-line thought. Add photos, GIFs and audio. However you show up, it belongs here.",
  },
  {
    icon: IconMessages,
    title: "Connect",
    body: "Follow the people you like, reply out in the open, or slide into DMs. Real conversations — not a race for clout.",
  },
  {
    icon: IconCompass,
    title: "Discover",
    body: "Browse by tag, join communities, and find your people through the things they actually make and share.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-10 flex items-center gap-3">
        <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
          How it works
        </span>
        <span className="h-px flex-1 bg-vocl-border" />
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-vocl-primary text-white">
                <Icon size={20} stroke={1.75} />
              </span>
              <span className="type-meta font-semibold text-foreground/40">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-4 type-display text-xl font-bold text-foreground">
              {title}
            </h3>
            <p className="mt-2 type-body text-foreground/65">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
