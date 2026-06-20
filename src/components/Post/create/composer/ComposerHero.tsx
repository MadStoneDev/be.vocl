"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  IconX,
  IconLink,
  IconUpload,
  IconCheck,
  IconBrandSpotify,
  IconSearch,
  IconCamera,
  IconGif,
  IconMicrophone,
  IconLoader2,
  IconMusic,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { parseVideoUrl, SUPPORTED_VIDEO_PLATFORMS } from "@/lib/video-embeds";
import { MediaUploader } from "../MediaUploader";
import { VoiceRecorder } from "../VoiceRecorder";
import { GifPicker } from "@/components/chat/GifPicker";
import type { ComposerState } from "./useComposerState";

interface ComposerHeroProps {
  state: ComposerState;
  patch: (payload: Partial<ComposerState>) => void;
}

const altTextField = (
  value: string,
  onChange: (v: string) => void,
  label: string
) => (
  <div className="space-y-1">
    <p className="text-xs text-foreground/45">{label}</p>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, 500))}
      placeholder="Describe this for screen readers (alt text)"
      maxLength={500}
      className="w-full py-2 px-3 text-sm bg-[var(--vocl-hover)] border border-[var(--vocl-border)] rounded-lg text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-[var(--vocl-primary)] transition-colors"
    />
    <span className="text-[10px] text-foreground/35 block text-right">
      {value.length}/500
    </span>
  </div>
);

const modeButton = (
  active: boolean,
  onClick: () => void,
  icon: React.ReactNode,
  label: string,
  activeColor = "var(--vocl-primary)"
) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
      active ? "text-white" : "text-foreground/60 hover:text-foreground"
    }`}
    style={active ? { backgroundColor: activeColor } : undefined}
  >
    {icon}
    {label}
  </button>
);

export function ComposerHero({ state, patch }: ComposerHeroProps) {
  const { postType, postId } = state;

  // Debounced Spotify search
  useEffect(() => {
    if (postType !== "audio" || state.audioMode !== "spotify") return;
    if (!state.spotifyQuery.trim() || state.spotifyQuery.length < 2) {
      patch({ spotifyResults: [] });
      return;
    }
    const timer = setTimeout(async () => {
      patch({ isSearching: true });
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(state.spotifyQuery)}`
        );
        const data = await res.json();
        patch({ spotifyResults: data.tracks || [], isSearching: false });
      } catch {
        patch({ spotifyResults: [], isSearching: false });
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.spotifyQuery, state.audioMode, postType]);

  // Debounced Unsplash search
  useEffect(() => {
    if (postType !== "image" || state.imageMode !== "unsplash") return;
    if (!state.unsplashQuery.trim() || state.unsplashQuery.length < 2) {
      patch({ unsplashResults: [] });
      return;
    }
    const timer = setTimeout(async () => {
      patch({ isSearchingUnsplash: true });
      try {
        const res = await fetch(
          `/api/unsplash/search?q=${encodeURIComponent(state.unsplashQuery)}`
        );
        const data = await res.json();
        patch({ unsplashResults: data.results || [], isSearchingUnsplash: false });
      } catch {
        patch({ unsplashResults: [], isSearchingUnsplash: false });
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.unsplashQuery, state.imageMode, postType]);

  // ---------- IMAGE ----------
  if (postType === "image") {
    return (
      <div className="space-y-4">
        <div className="flex rounded-xl bg-[var(--vocl-hover)] p-1">
          {modeButton(
            state.imageMode === "upload",
            () => patch({ imageMode: "upload", imageLinkUrl: "", imageLinkError: null }),
            <IconUpload size={16} />,
            "Upload"
          )}
          {modeButton(
            state.imageMode === "link",
            () => patch({ imageMode: "link", mediaUrls: [] }),
            <IconLink size={16} />,
            "Link"
          )}
          {modeButton(
            state.imageMode === "unsplash",
            () => patch({ imageMode: "unsplash", mediaUrls: [], imageLinkUrl: "" }),
            <IconCamera size={16} />,
            "Unsplash"
          )}
        </div>

        {state.imageMode === "upload" && postId && (
          <MediaUploader
            postId={postId}
            mediaType="image"
            existingUrls={state.mediaUrls}
            maxFiles={10}
            onUploadComplete={(urls) => {
              const next = [...state.altTexts];
              while (next.length < urls.length) next.push("");
              patch({ mediaUrls: urls, altTexts: next.slice(0, urls.length) });
            }}
          />
        )}

        {state.imageMode === "upload" &&
          state.mediaUrls.length > 0 &&
          state.mediaUrls.map((url, index) => (
            <div key={url} className="flex items-start gap-2">
              <div className="relative w-10 h-10 rounded-md overflow-hidden bg-black/20 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                {altTextField(
                  state.altTexts[index] || "",
                  (v) => {
                    const next = [...state.altTexts];
                    while (next.length <= index) next.push("");
                    next[index] = v;
                    patch({ altTexts: next });
                  },
                  "Alt text"
                )}
              </div>
            </div>
          ))}

        {state.imageMode === "link" && (
          <div className="space-y-3">
            <input
              type="url"
              value={state.imageLinkUrl}
              onChange={(e) => {
                const value = e.target.value;
                let error: string | null = null;
                if (value.trim()) {
                  try {
                    const url = new URL(value);
                    if (!url.protocol.startsWith("http")) {
                      error = "Please enter a valid HTTP or HTTPS URL";
                    }
                  } catch {
                    error = "Please enter a valid URL";
                  }
                }
                patch({ imageLinkUrl: value, imageLinkError: error });
              }}
              placeholder="Paste image URL (https://example.com/image.jpg)"
              className={`w-full py-3 px-4 rounded-xl bg-[var(--vocl-hover)] border text-foreground placeholder:text-foreground/40 focus:outline-none transition-colors ${
                state.imageLinkError
                  ? "border-vocl-like"
                  : "border-[var(--vocl-border)] focus:border-[var(--vocl-primary)]"
              }`}
            />
            {state.imageLinkError && (
              <p className="text-xs text-vocl-like">{state.imageLinkError}</p>
            )}
            {state.imageLinkUrl && !state.imageLinkError && (
              <>
                <div className="rounded-xl overflow-hidden border border-[var(--vocl-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.imageLinkUrl}
                    alt="Preview"
                    className="w-full max-h-72 object-contain bg-black/20"
                    onError={() =>
                      patch({ imageLinkError: "Could not load image from this URL" })
                    }
                  />
                </div>
                {altTextField(
                  state.altTexts[0] || "",
                  (v) => patch({ altTexts: [v] }),
                  "Alt text"
                )}
              </>
            )}
          </div>
        )}

        {state.imageMode === "unsplash" && (
          <div className="space-y-3">
            <div className="relative">
              <IconSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                type="text"
                value={state.unsplashQuery}
                onChange={(e) => patch({ unsplashQuery: e.target.value })}
                placeholder="Search Unsplash photos…"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-[var(--vocl-hover)] rounded-xl border border-[var(--vocl-border)] text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-[var(--vocl-primary)]"
              />
            </div>
            {state.isSearchingUnsplash && (
              <div className="flex justify-center py-8">
                <IconLoader2 size={24} className="animate-spin text-[var(--vocl-primary)]" />
              </div>
            )}
            {state.selectedUnsplash && (
              <>
                <div className="relative rounded-xl overflow-hidden border border-[var(--vocl-primary)]/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.selectedUnsplash.urls.small}
                    alt={state.selectedUnsplash.alt_description || ""}
                    className="w-full max-h-72 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2 text-xs text-white">
                    Photo by{" "}
                    <a
                      href={`${state.selectedUnsplash.user.links.html}?utm_source=bevocl&utm_medium=referral`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {state.selectedUnsplash.user.name}
                    </a>{" "}
                    on{" "}
                    <a
                      href="https://unsplash.com/?utm_source=bevocl&utm_medium=referral"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Unsplash
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => patch({ selectedUnsplash: null, altTexts: [] })}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <IconX size={14} />
                  </button>
                </div>
                {altTextField(
                  state.altTexts[0] || "",
                  (v) => patch({ altTexts: [v] }),
                  "Alt text"
                )}
              </>
            )}
            {!state.selectedUnsplash && state.unsplashResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {state.unsplashResults.map((photo: any) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={async () => {
                      patch({
                        selectedUnsplash: photo,
                        altTexts: [photo.alt_description || ""],
                      });
                      try {
                        await fetch("/api/unsplash/download", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            downloadLocation: photo.links.download_location,
                          }),
                        });
                      } catch {}
                    }}
                    className="relative rounded-lg overflow-hidden hover:opacity-80 transition-opacity aspect-square"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.urls.thumb}
                      alt={photo.alt_description || ""}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-[10px] text-white truncate">
                      {photo.user.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------- VIDEO ----------
  if (postType === "video") {
    const parsed = state.videoEmbedUrl ? parseVideoUrl(state.videoEmbedUrl) : null;
    return (
      <div className="space-y-4">
        <div className="flex rounded-xl bg-[var(--vocl-hover)] p-1">
          {modeButton(
            state.videoMode === "embed",
            () => patch({ videoMode: "embed", mediaUrls: [], hasAcknowledgedRights: false }),
            <IconLink size={16} />,
            "Embed URL"
          )}
          {modeButton(
            state.videoMode === "upload",
            () => patch({ videoMode: "upload", videoEmbedUrl: "", videoEmbedError: null }),
            <IconUpload size={16} />,
            "Upload"
          )}
        </div>

        {state.videoMode === "embed" && (
          <div className="space-y-3">
            <input
              type="url"
              value={state.videoEmbedUrl}
              onChange={(e) => {
                const value = e.target.value;
                let error: string | null = null;
                if (value.trim() && !parseVideoUrl(value)) {
                  error = "URL not recognized. Supported: YouTube, Vimeo, Rumble, Dailymotion";
                }
                patch({ videoEmbedUrl: value, videoEmbedError: error });
              }}
              placeholder="Paste video URL (YouTube, Vimeo, Rumble, Dailymotion)"
              className={`w-full py-3 px-4 rounded-xl bg-[var(--vocl-hover)] border text-foreground placeholder:text-foreground/40 focus:outline-none transition-colors ${
                state.videoEmbedError
                  ? "border-vocl-like"
                  : parsed
                    ? "border-green-500"
                    : "border-[var(--vocl-border)] focus:border-[var(--vocl-primary)]"
              }`}
            />
            {state.videoEmbedError && (
              <p className="text-xs text-vocl-like">{state.videoEmbedError}</p>
            )}
            {parsed && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <IconCheck size={14} />
                {parsed.platform.charAt(0).toUpperCase() + parsed.platform.slice(1)} video detected
              </p>
            )}
            <div className="text-xs text-foreground/40">
              <p className="font-medium mb-1">Supported platforms:</p>
              <ul className="space-y-0.5">
                {SUPPORTED_VIDEO_PLATFORMS.map((p) => (
                  <li key={p.id}>
                    {p.name} ({p.domain})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {state.videoMode === "upload" && postId && (
          <div className="space-y-3">
            <MediaUploader
              postId={postId}
              mediaType="video"
              existingUrls={state.mediaUrls}
              maxFiles={1}
              onUploadComplete={(urls) => patch({ mediaUrls: urls })}
            />
            <RightsAcknowledgment
              checked={state.hasAcknowledgedRights}
              onChange={(v) => patch({ hasAcknowledgedRights: v })}
            />
          </div>
        )}
      </div>
    );
  }

  // ---------- AUDIO ----------
  if (postType === "audio") {
    return (
      <div className="space-y-4">
        <div className="flex rounded-xl bg-[var(--vocl-hover)] p-1">
          {modeButton(
            state.audioMode === "spotify",
            () => patch({ audioMode: "spotify", mediaUrls: [], hasAcknowledgedRights: false }),
            <IconBrandSpotify size={16} />,
            "Spotify",
            "#1DB954"
          )}
          {modeButton(
            state.audioMode === "upload",
            () =>
              patch({
                audioMode: "upload",
                selectedTrack: null,
                spotifyQuery: "",
                spotifyResults: [],
                recordedAudioUrl: null,
                recordedDuration: 0,
              }),
            <IconUpload size={16} />,
            "Upload"
          )}
          {modeButton(
            state.audioMode === "record",
            () =>
              patch({
                audioMode: "record",
                selectedTrack: null,
                spotifyQuery: "",
                spotifyResults: [],
                mediaUrls: [],
              }),
            <IconMicrophone size={16} />,
            "Record"
          )}
        </div>

        {state.audioMode === "spotify" && (
          <div className="space-y-3">
            {!state.selectedTrack ? (
              <>
                <div className="relative">
                  <IconSearch
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40"
                  />
                  <input
                    type="text"
                    value={state.spotifyQuery}
                    onChange={(e) => patch({ spotifyQuery: e.target.value })}
                    placeholder="Search for a song…"
                    className="w-full py-3 pl-10 pr-4 rounded-xl bg-[var(--vocl-hover)] border border-[var(--vocl-border)] text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-[#1DB954] transition-colors"
                  />
                  {state.isSearching && (
                    <IconLoader2
                      size={18}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/40 animate-spin"
                    />
                  )}
                </div>
                {state.spotifyResults.length > 0 && (
                  <div className="rounded-xl border border-[var(--vocl-border)] overflow-hidden divide-y divide-[var(--vocl-border)]">
                    {state.spotifyResults.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() =>
                          patch({
                            selectedTrack: track,
                            spotifyQuery: "",
                            spotifyResults: [],
                          })
                        }
                        className="w-full flex items-center gap-3 p-3 hover:bg-[var(--vocl-hover)] transition-colors text-left"
                      >
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-vocl-surface-dark flex-shrink-0">
                          {track.albumArt ? (
                            <Image
                              src={track.albumArt}
                              alt={track.album}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <IconMusic size={16} className="text-foreground/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {track.name}
                          </p>
                          <p className="text-xs text-foreground/50 truncate">
                            {track.artist} &middot; {track.album}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {state.spotifyQuery.length >= 2 &&
                  !state.isSearching &&
                  state.spotifyResults.length === 0 && (
                    <p className="text-center text-sm text-foreground/40 py-4">
                      No results found
                    </p>
                  )}
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--vocl-hover)] border border-[#1DB954]/30">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-vocl-surface-dark flex-shrink-0">
                  {state.selectedTrack.albumArt ? (
                    <Image
                      src={state.selectedTrack.albumArt}
                      alt={state.selectedTrack.album}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconMusic size={20} className="text-foreground/20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {state.selectedTrack.name}
                  </p>
                  <p className="text-xs text-foreground/50 truncate">
                    {state.selectedTrack.artist}
                  </p>
                  <p className="text-xs text-foreground/30 truncate">
                    {state.selectedTrack.album}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ selectedTrack: null })}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/40 hover:text-foreground hover:bg-[var(--vocl-hover)] transition-colors flex-shrink-0"
                >
                  <IconX size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {state.audioMode === "upload" && postId && (
          <div className="space-y-3">
            <MediaUploader
              postId={postId}
              mediaType="audio"
              existingUrls={state.mediaUrls}
              maxFiles={1}
              onUploadComplete={(urls) => patch({ mediaUrls: urls })}
            />
            <RightsAcknowledgment
              checked={state.hasAcknowledgedRights}
              onChange={(v) => patch({ hasAcknowledgedRights: v })}
            />
          </div>
        )}

        {state.audioMode === "record" && postId && (
          <VoiceRecorder
            postId={postId}
            uploadedUrl={state.recordedAudioUrl}
            onComplete={(url, duration) =>
              patch({ recordedAudioUrl: url, recordedDuration: duration })
            }
            onClear={() => patch({ recordedAudioUrl: null, recordedDuration: 0 })}
          />
        )}
      </div>
    );
  }

  // ---------- GIF ----------
  if (postType === "gif") {
    return (
      <div className="space-y-4">
        {state.selectedGifUrl ? (
          <>
            <div className="relative rounded-xl overflow-hidden border border-[var(--vocl-primary)]/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.selectedGifUrl}
                alt="Selected GIF"
                className="w-full max-h-96 object-contain bg-black/20"
              />
              <button
                type="button"
                onClick={() =>
                  patch({ selectedGifUrl: null, altTexts: [], gifPickerOpen: true })
                }
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <IconX size={16} />
              </button>
            </div>
            {altTextField(
              state.altTexts[0] || "",
              (v) => patch({ altTexts: [v] }),
              "Alt text"
            )}
          </>
        ) : (
          <div className="relative">
            <GifPicker
              isOpen={state.gifPickerOpen}
              onClose={() => patch({ gifPickerOpen: false })}
              onSelect={(gifUrl) =>
                patch({ selectedGifUrl: gifUrl, gifPickerOpen: false })
              }
              inline
            />
            {!state.gifPickerOpen && (
              <button
                type="button"
                onClick={() => patch({ gifPickerOpen: true })}
                className="w-full py-10 rounded-xl border border-dashed border-[var(--vocl-border)] hover:border-[var(--vocl-primary)]/50 bg-[var(--vocl-hover)] flex flex-col items-center gap-2 text-foreground/50 hover:text-[var(--vocl-primary)] transition-colors"
              >
                <IconGif size={32} />
                <span className="text-sm font-medium">Click to browse GIFs</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------- POLL ----------
  if (postType === "poll") {
    return (
      <div className="space-y-4">
        <input
          type="text"
          value={state.pollQuestion}
          onChange={(e) => patch({ pollQuestion: e.target.value })}
          placeholder="Ask a question…"
          maxLength={280}
          className="w-full type-heading bg-transparent border-0 border-b border-[var(--vocl-border)] pb-2 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-[var(--vocl-primary)] transition-colors"
        />

        <div className="space-y-2">
          {state.pollOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const next = [...state.pollOptions];
                  next[index] = e.target.value;
                  patch({ pollOptions: next });
                }}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--vocl-hover)] border border-[var(--vocl-border)] text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-[var(--vocl-primary)]"
              />
              {state.pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      pollOptions: state.pollOptions.filter((_, i) => i !== index),
                    })
                  }
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-foreground/40 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
                >
                  <IconTrash size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        {state.pollOptions.length < 4 && (
          <button
            type="button"
            onClick={() => patch({ pollOptions: [...state.pollOptions, ""] })}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "var(--vocl-primary)" }}
          >
            <IconPlus size={16} />
            Add option
          </button>
        )}

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-sm text-foreground/60 mb-2">
              Poll duration (optional)
            </label>
            <select
              value={state.pollExpiresAt}
              onChange={(e) => patch({ pollExpiresAt: e.target.value })}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--vocl-hover)] border border-[var(--vocl-border)] text-foreground focus:outline-none focus:border-[var(--vocl-primary)]"
            >
              <option value="">No expiration</option>
              <option value={new Date(Date.now() + 1 * 86400000).toISOString()}>
                1 day
              </option>
              <option value={new Date(Date.now() + 3 * 86400000).toISOString()}>
                3 days
              </option>
              <option value={new Date(Date.now() + 7 * 86400000).toISOString()}>
                1 week
              </option>
            </select>
          </div>

          <PollToggle
            checked={state.pollShowResultsBeforeVote}
            onChange={(v) => patch({ pollShowResultsBeforeVote: v })}
            title="Show results before voting"
            sub="Let users see results without voting first"
          />
          <PollToggle
            checked={state.pollAllowMultiple}
            onChange={(v) => patch({ pollAllowMultiple: v })}
            title="Allow multiple choices"
            sub="Users can select more than one option"
          />
        </div>
      </div>
    );
  }

  return null;
}

function RightsAcknowledgment({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-[var(--vocl-border)] bg-[var(--vocl-hover)] text-[var(--vocl-primary)] focus:ring-0"
      />
      <div className="flex-1 text-xs text-foreground/70">
        <span className="font-medium text-amber-500">Rights Acknowledgment:</span>{" "}
        By uploading this file, I confirm that I own or have obtained the necessary
        rights, licenses, or permissions to publish this content. I understand that
        uploading copyrighted material without authorization may result in content
        removal and account action.
      </div>
    </label>
  );
}

function PollToggle({
  checked,
  onChange,
  title,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--vocl-hover)] w-full text-left"
    >
      <div
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{
          backgroundColor: checked
            ? "var(--vocl-primary)"
            : "var(--vocl-border)",
        }}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </div>
      <div className="flex-1">
        <div className="text-foreground text-sm font-medium">{title}</div>
        <p className="text-foreground/40 text-xs mt-0.5">{sub}</p>
      </div>
    </button>
  );
}
