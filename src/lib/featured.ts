import "server-only";
import fs from "node:fs";
import path from "node:path";

export interface FeaturedPost {
  slug: string;
  title: string;
  tags: string[];
  excerpt: string;
  image: string;
  author?: string;
  /** Lower sorts first. Defaults to filename order. */
  order: number;
  /** Markdown body (kept for a future reader view; not used on the card). */
  body: string;
}

const FEATURED_DIR = path.join(process.cwd(), "src/content/featured");

/** Minimal YAML-ish frontmatter parser — supports `key: value` and `tags: [a, b]`. */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const [, fm, body] = match;
  const data: Record<string, unknown> = {};

  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!key) continue;

    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return { data, body: body.trim() };
}

/** Read + parse all featured markdown posts, sorted by `order` then slug. */
export function getFeaturedPosts(): FeaturedPost[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(FEATURED_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(FEATURED_DIR, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, "");
    return {
      slug,
      title: String(data.title ?? slug),
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      excerpt: String(data.excerpt ?? ""),
      image: String(data.image ?? ""),
      author: data.author ? String(data.author) : undefined,
      order: data.order !== undefined ? Number(data.order) : 999,
      body,
    } satisfies FeaturedPost;
  });

  return posts.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

/** Load a single featured post by slug (or null). */
export function getFeaturedPost(slug: string): FeaturedPost | null {
  // Guard against path traversal — slugs are single path segments.
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  return getFeaturedPosts().find((p) => p.slug === slug) ?? null;
}

/**
 * Minimal Markdown → HTML for the TRUSTED featured content (repo-authored, not
 * user input). Handles paragraphs, headings, blockquotes, simple lists, and
 * inline bold/italic/links.
 */
export function featuredBodyToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

  return md
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      if (b.startsWith("### ")) return `<h3>${inline(b.slice(4))}</h3>`;
      if (b.startsWith("## ")) return `<h2>${inline(b.slice(3))}</h2>`;
      if (b.startsWith("# ")) return `<h2>${inline(b.slice(2))}</h2>`;
      if (b.startsWith("> ")) return `<blockquote>${inline(b.replace(/^> ?/gm, ""))}</blockquote>`;
      if (/^[-*] /.test(b)) {
        const items = b
          .split("\n")
          .map((l) => `<li>${inline(l.replace(/^[-*] /, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(b.replace(/\n/g, " "))}</p>`;
    })
    .join("\n");
}
