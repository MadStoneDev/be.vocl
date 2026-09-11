"use client";

import { IconExternalLink, IconLink } from "@tabler/icons-react";

interface ProfileLink {
  id: string;
  title: string;
  url: string;
}

interface ProfileLinksProps {
  links: ProfileLink[];
}

// Get favicon URL for a domain
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

// Get display domain from URL
function getDisplayDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function ProfileLinks({ links }: ProfileLinksProps) {
  if (links.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="slug text-meta-dim flex items-center gap-2 pb-3 border-b border-rule">
        <IconLink size={13} />
        Links
      </h3>
      <div>
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 py-3 border-b border-rule hover:bg-vocl-hover transition-colors"
          >
            {/* Favicon */}
            <div className="w-8 h-8 bg-panel flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={getFaviconUrl(link.url)}
                alt=""
                className="w-5 h-5"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            {/* Link info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate group-hover:text-accent transition-colors">
                {link.title}
              </p>
              <p className="byline text-meta truncate mt-0.5 normal-case tracking-normal">
                {getDisplayDomain(link.url)}
              </p>
            </div>

            {/* External link icon */}
            <IconExternalLink
              size={16}
              className="text-meta-dim group-hover:text-accent transition-colors flex-shrink-0"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
