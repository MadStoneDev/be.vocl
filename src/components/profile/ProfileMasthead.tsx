import Link from "next/link";

interface ProfileMastheadProps {
  /** Right-rail facts, artboard 03: Joined / Writes as / Mostly. */
  joined?: string;
  writesAs?: string;
  mostly?: string;
  /** Section hashtags the columnist writes in (aggregated from their posts). */
  sections?: string[];
  /** The member's own links. */
  links?: { id: string; title: string; url: string }[];
}

function Slug({ children }: { children: React.ReactNode }) {
  return <div className="slug text-meta border-b border-rule pb-3">{children}</div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule py-3 text-[13px]">
      <span className="text-meta">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  );
}

/**
 * The columnist's "Masthead" rail (artboard 03, right column): a stack of
 * label→value facts, the sections they write in, and their links — all on
 * hairline rules, no cards.
 */
export function ProfileMasthead({ joined, writesAs, mostly, sections, links }: ProfileMastheadProps) {
  const hasFacts = joined || writesAs || mostly;
  const hasSections = sections && sections.length > 0;
  const hasLinks = links && links.length > 0;

  if (!hasFacts && !hasSections && !hasLinks) return null;

  return (
    <div className="space-y-8">
      {hasFacts && (
        <div>
          <Slug>Masthead</Slug>
          {joined && <Fact label="Joined" value={joined} />}
          {writesAs && <Fact label="Writes as" value={writesAs} />}
          {mostly && <Fact label="Mostly" value={mostly} />}
        </div>
      )}

      {hasSections && (
        <div>
          <Slug>Sections</Slug>
          <div className="flex flex-wrap gap-x-4 gap-y-2 py-3.5 text-[13px]">
            {sections!.map((tag) => (
              <Link
                key={tag}
                href={`/discover/tag/${encodeURIComponent(tag)}`}
                className="text-editorial-body hover:text-accent transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasLinks && (
        <div>
          <Slug>Links</Slug>
          {links!.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block border-b border-rule py-3 text-[13px] text-ink hover:text-accent transition-colors truncate"
            >
              {l.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
