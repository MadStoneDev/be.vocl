import type { VideoEmbedPlatform } from "@/types/database";

export interface ParsedVideoEmbed {
  platform: VideoEmbedPlatform;
  videoId: string;
  embedUrl: string;
  thumbnailUrl?: string;
}

/**
 * Supported video platform patterns
 */
const VIDEO_PATTERNS: Record<VideoEmbedPlatform, RegExp[]> = {
  youtube: [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: youtu.be/VIDEO_ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Shorts: youtube.com/shorts/VIDEO_ID
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  vimeo: [
    // Standard: vimeo.com/VIDEO_ID
    /vimeo\.com\/(\d+)/,
    // Player embed: player.vimeo.com/video/VIDEO_ID
    /player\.vimeo\.com\/video\/(\d+)/,
  ],
  rumble: [
    // Embed URL: rumble.com/embed/VIDEO_ID
    /rumble\.com\/embed\/([a-zA-Z0-9]+)/,
    // Standard URL: rumble.com/VIDEO_ID-title.html
    /rumble\.com\/([a-zA-Z0-9]+)-[^\/]+\.html/,
  ],
  dailymotion: [
    // Standard: dailymotion.com/video/VIDEO_ID
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    // Embed: dailymotion.com/embed/video/VIDEO_ID
    /dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/,
    // Short URL: dai.ly/VIDEO_ID
    /dai\.ly\/([a-zA-Z0-9]+)/,
  ],
};

/**
 * Generate embed URL for each platform
 */
function getEmbedUrl(platform: VideoEmbedPlatform, videoId: string): string {
  switch (platform) {
    case "youtube":
      return `https://www.youtube.com/embed/${videoId}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${videoId}`;
    case "rumble":
      return `https://rumble.com/embed/${videoId}/`;
    case "dailymotion":
      return `https://www.dailymotion.com/embed/video/${videoId}`;
  }
}

/**
 * Get thumbnail URL for video platforms (when available)
 */
function getThumbnailUrl(platform: VideoEmbedPlatform, videoId: string): string | undefined {
  switch (platform) {
    case "youtube":
      // YouTube provides predictable thumbnail URLs
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    case "vimeo":
      // Vimeo requires API call for thumbnails, skip for now
      return undefined;
    case "rumble":
      // Rumble doesn't have predictable thumbnail URLs
      return undefined;
    case "dailymotion":
      // Dailymotion provides predictable thumbnail URLs
      return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
  }
}

/**
 * Parse a video URL and extract platform info
 * Returns null if URL is not from a supported platform
 */
export function parseVideoUrl(url: string): ParsedVideoEmbed | null {
  if (!url) return null;

  // Normalize URL
  const normalizedUrl = url.trim();

  for (const [platform, patterns] of Object.entries(VIDEO_PATTERNS) as [VideoEmbedPlatform, RegExp[]][]) {
    for (const pattern of patterns) {
      const match = normalizedUrl.match(pattern);
      if (match && match[1]) {
        const videoId = match[1];
        return {
          platform,
          videoId,
          embedUrl: getEmbedUrl(platform, videoId),
          thumbnailUrl: getThumbnailUrl(platform, videoId),
        };
      }
    }
  }

  return null;
}

/**
 * Check if a URL is from a supported video platform
 */
export function isSupportedVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

/**
 * Get human-readable platform name
 */
export function getPlatformDisplayName(platform: VideoEmbedPlatform): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "rumble":
      return "Rumble";
    case "dailymotion":
      return "Dailymotion";
  }
}

/**
 * List of supported platforms for display
 */
export const SUPPORTED_VIDEO_PLATFORMS = [
  { id: "youtube", name: "YouTube", domain: "youtube.com, youtu.be" },
  { id: "vimeo", name: "Vimeo", domain: "vimeo.com" },
  { id: "rumble", name: "Rumble", domain: "rumble.com" },
  { id: "dailymotion", name: "Dailymotion", domain: "dailymotion.com, dai.ly" },
] as const;
