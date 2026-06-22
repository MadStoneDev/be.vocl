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
