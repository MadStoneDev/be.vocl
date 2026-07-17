# Post Blocks — v2 sketch (not yet built)

Captured so the multi-type/multi-block direction isn't accidentally blocked by
today's decisions. **Status: design note only.** The shipped composer keeps the
current one-type-per-post model with a prominent type switcher
(`ComposerTypeBar`) — this doc is the future path.

## Today (v1, shipped)

A post has a single `postType` (`text | image | video | audio | gif | poll`)
and a type-specific `content` JSON blob (`TextPostContent`, `ImagePostContent`,
…). One composer body per type. Sources are already covered per type
(image: upload/unsplash, audio: spotify/upload/record, video: youtube/upload,
gif: giphy). Renderers switch on `postType` (`FrontPageTile`, `InteractivePost`,
post page, reader, etc.).

## v2 — Tumblr NPF-style blocks

A post becomes an **ordered array of typed blocks**. The **lead block** (first,
or an explicit `leadIndex`) drives how the card renders in feed/front-page; the
full stack renders on the permalink/reader.

```ts
type BlockType = "text" | "image" | "gallery" | "video" | "audio" | "gif" | "link" | "poll";

interface PostBlock {
  id: string;            // stable per block (edit/reorder)
  type: BlockType;
  // exactly one payload matching `type`:
  text?: { html: string; plain: string; heading?: boolean };
  image?: { url: string; alt?: string; source?: "upload" | "unsplash"; w?: number; h?: number };
  video?: { embedUrl?: string; uploadUrl?: string; platform?: VideoEmbedPlatform; thumbnailUrl?: string };
  audio?: { uploadUrl?: string; spotify?: SpotifyData; isVoiceNote?: boolean; transcript?: string };
  gif?: { url: string; source: "giphy" | "upload" };
  link?: LinkPreviewData;
  poll?: PollPostContent;
}

interface PostContentV2 {
  version: 2;
  blocks: PostBlock[];
  leadIndex?: number;    // default 0
}
```

## Migration strategy (non-breaking)

- **Discriminate by `content.version`.** Absent/`1` → existing typed renderers;
  `2` → block renderer. No backfill required; old posts render unchanged.
- Add a `contentVersion` column (or read `content.version`) so queries can branch
  cheaply.
- Derive a legacy `postType` for a v2 post from `blocks[leadIndex].type` so the
  feed's scoring/media heuristics (`useFeedLayout`, `postHasMedia`) keep working
  with minimal change.

## What it touches (scope check before committing to it)

Composer (block editor + reorder), a new `PostBlocks` renderer, and every
surface that switches on `postType`: feed tiles, front page, post page, reader,
thread, tag, search, profile, queue, moderation preview, edit hydration,
notifications, and the OG/preview generation. Plus content-moderation needs to
walk every block, not just the top type. This is a multi-week project + a schema
version bump — deliberately deferred past the friends beta.

## Cheap half-step (if we want more than v1 before full v2)

Allow **one optional trailing media block** on a text post (e.g. text + image,
or text + link card) without full block editing — covers the most common
"multi-type" desire (a note with a photo) at a fraction of the cost. Would still
use the v2 discriminator so it's forward-compatible.
