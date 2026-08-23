// The canonical database schema is the auto-generated database.types.ts at the
// repo root (regenerate it from Supabase). This module re-exports that schema and
// adds the hand-authored convenience aliases + JSON `content`-column shapes that
// aren't part of the generated DB schema.
import type { Database, Json } from "../../database.types";
export type { Database, Json };
export type { Tables, TablesInsert, TablesUpdate, Enums } from "../../database.types";

export type PostType = "text" | "image" | "video" | "audio" | "gallery" | "poll" | "ask";
export type PostStatus = "draft" | "published" | "queued" | "scheduled" | "deleted";
export type NotificationType = "follow" | "like" | "comment" | "reblog" | "message" | "mention" | "ask" | "moderation" | "appeal" | "tip" | "system";
export type LockStatus = "unlocked" | "restricted" | "banned";
/** Per-post audience tier. public = anyone (incl. logged-out); members = any
 *  logged-in user; followers = only accounts that follow the author. */
export type PostAudience = "public" | "members" | "followers";
export type ReportSubject = "minor_safety" | "non_consensual" | "harassment" | "spam" | "illegal" | "other";
export type ReportSource = "user_report" | "auto_moderation" | "promise_declined";
export type ReportStatus = "pending" | "reviewing" | "escalated" | "resolved_ban" | "resolved_restrict" | "resolved_dismissed" | "resolved_approved";
export type FlagSubject = "minor_safety" | "non_consensual" | "harassment" | "spam" | "illegal" | "copyright" | "misinformation" | "other";
export type FlagStatus = "pending" | "reviewing" | "escalated" | "resolved_removed" | "resolved_flagged" | "resolved_dismissed";
export type AppealStatus = "pending" | "approved" | "denied" | "blocked";
export type ModerationStatus = "pending" | "approved" | "flagged" | "removed";
export type ExportStatus = "pending" | "processing" | "completed" | "failed";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

export type Like = Database["public"]["Tables"]["likes"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationParticipant = Database["public"]["Tables"]["conversation_participants"]["Row"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type PostTag = Database["public"]["Tables"]["post_tags"]["Row"];

// Link preview data (stored in text post content at publish time)
export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// Content type definitions for posts
export interface TextPostContent {
  html: string;
  plain: string;
  link_previews?: LinkPreviewData[];
  is_essay?: boolean;
  essay_title?: string;
  reading_time_minutes?: number;
}

export interface ImagePostContent {
  urls: string[];
  alt_texts: string[];
  caption_html?: string;
}

export type VideoEmbedPlatform = 'youtube' | 'vimeo' | 'rumble' | 'dailymotion';

export interface VideoPostContent {
  // For file uploads
  url?: string;
  thumbnail_url?: string;
  duration?: number;
  // For embeds
  embed_url?: string;
  embed_platform?: VideoEmbedPlatform;
  embed_video_id?: string;
  // Common
  caption_html?: string;
}

export interface AudioPostContent {
  url?: string;
  album_art_url?: string;
  spotify_data?: {
    track_id: string;
    name: string;
    artist: string;
    album: string;
    album_art?: string;
    external_url?: string;
  };
  caption_html?: string;
}

export interface GalleryPostContent {
  items: Array<{
    type: "image" | "video";
    url: string;
    thumbnail_url?: string;
    alt_text?: string;
  }>;
  caption_html?: string;
}

export interface PollPostContent {
  question: string;
  options: string[]; // 2-4 options
  expires_at?: string; // Optional ISO date for poll expiration
  show_results_before_vote?: boolean; // Whether to show results before voting
  allow_multiple?: boolean; // Allow selecting multiple options (default: false)
}

export interface AskPostContent {
  question: string; // The original ask question
  question_html?: string; // Rich text version of question
  answer_html: string; // The answer (rich text)
  asker_id?: string; // null if anonymous
  asker_username?: string; // For display (can be "Anonymous")
  is_anonymous: boolean;
  // Voice (VOCL) audio for the question and/or the answer
  question_audio_url?: string | null;
  question_audio_duration?: number | null;
  question_audio_transcript?: string | null;
  answer_audio_url?: string | null;
  answer_audio_duration?: number | null;
  answer_audio_transcript?: string | null;
}

export type PostContent =
  | TextPostContent
  | ImagePostContent
  | VideoPostContent
  | AudioPostContent
  | GalleryPostContent
  | PollPostContent
  | AskPostContent;

// Extended post type with author info
export interface PostWithAuthor extends Post {
  author: Profile;
  like_count: number;
  comment_count: number;
  reblog_count: number;
  has_liked?: boolean;
  has_reblogged?: boolean;
  original_post?: PostWithAuthor | null;
  reblogged_from?: PostWithAuthor | null;
}

// Moderation types
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

export type Flag = Database["public"]["Tables"]["flags"]["Row"];
export type FlagInsert = Database["public"]["Tables"]["flags"]["Insert"];
export type FlagUpdate = Database["public"]["Tables"]["flags"]["Update"];

export type Appeal = Database["public"]["Tables"]["appeals"]["Row"];
export type AppealInsert = Database["public"]["Tables"]["appeals"]["Insert"];
export type AppealUpdate = Database["public"]["Tables"]["appeals"]["Update"];

export type EscalationHistory = Database["public"]["Tables"]["escalation_history"]["Row"];
export type EscalationHistoryInsert = Database["public"]["Tables"]["escalation_history"]["Insert"];

// Extended report with related data
export interface ReportWithDetails extends Report {
  reporter?: Profile | null;
  reported_user: Profile;
  assigned_moderator?: Profile | null;
  resolved_moderator?: Profile | null;
  escalation_history?: EscalationHistory[];
}

// Extended flag with related data
export interface FlagWithDetails extends Flag {
  flagger?: Profile | null;
  post: PostWithAuthor;
  assigned_moderator?: Profile | null;
  resolved_moderator?: Profile | null;
  escalation_history?: EscalationHistory[];
}

// Extended appeal with related data
export interface AppealWithDetails extends Appeal {
  user: Profile;
  report?: Report | null;
  reviewer?: Profile | null;
}
