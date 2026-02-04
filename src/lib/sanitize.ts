import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Use this for any user-generated HTML content before rendering with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      // Text formatting
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "del",
      "ins",
      "mark",
      "small",
      "sub",
      "sup",
      // Headings
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      // Lists
      "ul",
      "ol",
      "li",
      // Links
      "a",
      // Quotes and code
      "blockquote",
      "code",
      "pre",
      // Divs and spans for styling
      "div",
      "span",
      // Horizontal rule
      "hr",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "class",
      "id",
      // Data attributes for styling
      "data-*",
    ],
    // Force safe link attributes
    ADD_ATTR: ["target"],
    // Only allow safe protocols
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Force all links to open in new tab with security attributes
    FORCE_BODY: true,
  });
}

/**
 * Sanitize HTML and ensure all links have proper security attributes.
 * Adds target="_blank" and rel="noopener noreferrer" to all links.
 */
export function sanitizeHtmlWithSafeLinks(
  html: string | undefined | null
): string {
  if (!html) return "";

  // First sanitize
  let sanitized = sanitizeHtml(html);

  // Then ensure all links have proper attributes
  // This regex finds <a> tags and adds/updates their attributes
  sanitized = sanitized.replace(
    /<a\s+([^>]*href=[^>]*)>/gi,
    (match, attributes) => {
      // Remove existing target and rel
      let cleanAttrs = attributes
        .replace(/\s*target\s*=\s*["'][^"']*["']/gi, "")
        .replace(/\s*rel\s*=\s*["'][^"']*["']/gi, "");

      return `<a ${cleanAttrs} target="_blank" rel="noopener noreferrer">`;
    }
  );

  return sanitized;
}

/**
 * Validate a URL for safe protocols.
 * Returns true if the URL uses http, https, mailto, or tel protocols.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
  } catch {
    // If URL parsing fails, check if it's a relative URL starting with /
    return url.startsWith("/") && !url.startsWith("//");
  }
}

/**
 * Validate a URL for profile links (only http/https allowed).
 */
export function isValidProfileLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Strip all HTML tags and return plain text.
 * Useful for previews and notifications.
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
