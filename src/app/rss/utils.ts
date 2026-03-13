const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

export function getAppUrl(): string {
  return APP_URL;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function rssResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export function rss404(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Not Found</title>
    <description>${escapeXml(message)}</description>
  </channel>
</rss>`;
  return new Response(xml, {
    status: 404,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}

interface PostContent {
  plain?: string;
  html?: string;
  urls?: string[];
  url?: string;
}

export interface RssPost {
  id: string;
  post_type: string;
  content: PostContent;
  created_at: string;
  tags: string[] | null;
  author_username?: string;
  author_display_name?: string;
}

export function buildItemTitle(post: RssPost): string {
  if (post.content?.plain) {
    const text = post.content.plain;
    return text.length > 100 ? text.slice(0, 100) + "..." : text;
  }
  switch (post.post_type) {
    case "image":
      return "Image post";
    case "video":
      return "Video post";
    case "audio":
      return "Audio post";
    default:
      return "Post";
  }
}

export function buildItemDescription(post: RssPost): string {
  const parts: string[] = [];

  if (post.content?.html) {
    parts.push(post.content.html);
  } else if (post.content?.plain) {
    parts.push(`<p>${escapeXml(post.content.plain)}</p>`);
  }

  if (post.content?.urls) {
    for (const url of post.content.urls) {
      parts.push(`<p><img src="${escapeXml(url)}" alt="Post image" /></p>`);
    }
  }

  if (post.content?.url) {
    if (post.post_type === "video") {
      parts.push(
        `<p><a href="${escapeXml(post.content.url)}">View video</a></p>`
      );
    } else if (post.post_type === "audio") {
      parts.push(
        `<p><a href="${escapeXml(post.content.url)}">Listen to audio</a></p>`
      );
    }
  }

  return parts.join("\n");
}

export function buildRssItem(post: RssPost): string {
  const appUrl = getAppUrl();
  const title = escapeXml(buildItemTitle(post));
  const description = escapeXml(buildItemDescription(post));
  const link = `${appUrl}/post/${post.id}`;
  const pubDate = new Date(post.created_at).toUTCString();
  const authorLine = post.author_display_name
    ? `      <dc:creator>${escapeXml(post.author_display_name)}</dc:creator>\n`
    : "";

  return `    <item>
      <title>${title}</title>
      <description>${description}</description>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
${authorLine}    </item>`;
}

export function wrapRssChannel(
  title: string,
  description: string,
  link: string,
  items: string[]
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(link)}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>`;
}
