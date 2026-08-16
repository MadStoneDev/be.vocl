import "server-only";

/**
 * Data for the /vs/[slug] comparison pages.
 *
 * House rule: stay fair and factual. Each entry credits what the other
 * platform genuinely does well before drawing honest distinctions. We compare
 * on how the products differ — not by disparaging anyone. A brand whose pitch
 * is "we won't manipulate you" can't open with a hatchet job.
 */

export interface ComparisonRow {
  /** The dimension being compared, e.g. "Identity". */
  dimension: string;
  /** How be.vocl approaches it. */
  bevocl: string;
  /** How the other platform approaches it — stated neutrally. */
  them: string;
}

export interface Comparison {
  slug: string;
  /** Proper-cased platform name, e.g. "Tumblr". */
  competitor: string;
  /** Short hero subtitle. */
  tagline: string;
  /** Honest framing paragraph shown under the hero. */
  intro: string;
  /** What the other platform is genuinely good at (credit where due). */
  theirStrengths: string[];
  /** The side-by-side rows. */
  rows: ComparisonRow[];
  /** Closing "who each is for" — even-handed. */
  bottomLine: string;
  /** Meta description for SEO. */
  metaDescription: string;
}

const COMPARISONS: Comparison[] = [
  {
    slug: "tumblr",
    competitor: "Tumblr",
    tagline: "The reblog-era vibe, grown up — with the controls it never had.",
    intro:
      "Tumblr built something special: a home for fandoms, art, and a weird, warm internet that felt like nowhere else. be.vocl is for people who loved that energy but want more say over who sees their words and a platform that isn't tuned to keep them scrolling.",
    theirStrengths: [
      "Deep, long-lived fandom and subculture communities",
      "Reblog culture that spreads and remixes ideas fast",
      "Highly customisable blogs and a rich GIF/visual tradition",
      "Years of history and a genuine sense of internet identity",
    ],
    rows: [
      {
        dimension: "Who sees your post",
        bevocl: "Per-post choice: public, followers-only, or private.",
        them: "Blog-level and largely public by default.",
      },
      {
        dimension: "Mature content",
        bevocl: "Allowed, age-gated, and never shown on public surfaces.",
        them: "Adult content is heavily restricted.",
      },
      {
        dimension: "Your feed",
        bevocl: "Chronological and calm — no engagement-maximising algorithm.",
        them: "A mix of following and algorithmic recommendations.",
      },
      {
        dimension: "How it's funded",
        bevocl: "No ad-tracking and no selling your data.",
        them: "Ad-supported, with ads in the dashboard.",
      },
      {
        dimension: "Identity",
        bevocl: "Pseudonymous by design — a pen name is a first-class choice.",
        them: "Pseudonymous too, tied to your blog URL.",
      },
    ],
    bottomLine:
      "Tumblr is still the place for sprawling fandom and reblog chains. be.vocl is the place to write honestly with tight control over who's reading and a feed that isn't fighting for your attention.",
    metaDescription:
      "be.vocl vs Tumblr: a calmer place to write and share, with per-post privacy controls, no ad-tracking, and mature content that's never public. An honest comparison.",
  },
  {
    slug: "medium",
    competitor: "Medium",
    tagline: "Write for people, not for a paywall or a partner program.",
    intro:
      "Medium made long-form writing look beautiful and reach a big audience. be.vocl is for writers who want that clean reading experience without the paywall, the metrics pressure, or the push to sound like a thought-leader.",
    theirStrengths: [
      "A polished, distraction-free reading experience",
      "Large built-in readership and discovery",
      "Established writers and editorial publications",
      "Simple, familiar writing tools",
    ],
    rows: [
      {
        dimension: "Cost to readers",
        bevocl: "Free to read — no paywall or metered limit.",
        them: "Metered paywall; some stories are members-only.",
      },
      {
        dimension: "Identity",
        bevocl: "Write under a pen name; no real-name expectation.",
        them: "Profiles lean professional and real-name.",
      },
      {
        dimension: "Tone",
        bevocl: "Personal, unfiltered — vent, confess, think out loud.",
        them: "Skews professional and thought-leadership.",
      },
      {
        dimension: "Who sees your post",
        bevocl: "Per-post public, followers-only, or private.",
        them: "Public, with optional members-only distribution.",
      },
      {
        dimension: "How it's funded",
        bevocl: "No ad-tracking, no selling your data.",
        them: "Subscription-funded via the Partner Program.",
      },
    ],
    bottomLine:
      "Medium is a strong home for polished essays and professional reach. be.vocl is for writing that's personal first — free to read, pen-name friendly, and free of subscriber-count anxiety.",
    metaDescription:
      "be.vocl vs Medium: free to read, pen-name friendly, and personal — no paywall, no partner-program pressure, with per-post privacy controls. An honest comparison.",
  },
  {
    slug: "substack",
    competitor: "Substack",
    tagline: "Just write — without building a newsletter business first.",
    intro:
      "Substack is excellent if your goal is a newsletter and a paid subscriber base. be.vocl is for people who want to share and be part of a community without turning their writing into a growth funnel.",
    theirStrengths: [
      "Best-in-class email newsletter delivery",
      "Built-in paid subscriptions and creator payouts",
      "You own your subscriber email list",
      "Great for building a direct writer-to-reader business",
    ],
    rows: [
      {
        dimension: "What it's for",
        bevocl: "Community social blogging — post, reply, follow.",
        them: "Newsletters and paid subscriptions.",
      },
      {
        dimension: "Pressure",
        bevocl: "No subscriber counts to grow, no monetisation to chase.",
        them: "Success is framed around subscribers and revenue.",
      },
      {
        dimension: "How people read you",
        bevocl: "On-platform feed, tags, and communities.",
        them: "Primarily email, plus the Substack app.",
      },
      {
        dimension: "Identity",
        bevocl: "Pseudonymous by design.",
        them: "Usually tied to a named publication.",
      },
      {
        dimension: "Who sees your post",
        bevocl: "Per-post public, followers-only, or private.",
        them: "Public or paid-subscriber tiers.",
      },
    ],
    bottomLine:
      "Substack is the tool if you want to run a newsletter and get paid for it. be.vocl is for writing and connecting for its own sake — no list to build, no funnel to optimise.",
    metaDescription:
      "be.vocl vs Substack: community social blogging without the newsletter business — no subscriber pressure, pen-name friendly, with per-post privacy controls. An honest comparison.",
  },
];

export function getComparisons(): Comparison[] {
  return COMPARISONS;
}

export function getComparison(slug: string): Comparison | null {
  return COMPARISONS.find((c) => c.slug === slug) ?? null;
}
