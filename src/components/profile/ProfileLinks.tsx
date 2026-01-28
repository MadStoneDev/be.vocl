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
    <div className="mt-4 space-y-2">
      <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider flex items-center gap-2">
        <IconLink size={14} />
        Links
      </h3>
      <div className="space-y-1.5">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all"
          >
            {/* Favicon */}
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
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
              <p className="font-medium text-foreground text-sm truncate">
                {link.title}
              </p>
              <p className="text-xs text-foreground/40 truncate">
                {getDisplayDomain(link.url)}
              </p>
            </div>

            {/* External link icon */}
            <IconExternalLink
              size={16}
              className="text-foreground/30 group-hover:text-vocl-accent transition-colors flex-shrink-0"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
