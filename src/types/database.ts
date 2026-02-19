export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PostType = "text" | "image" | "video" | "audio" | "gallery" | "poll" | "ask";
export type PostStatus = "draft" | "published" | "queued" | "scheduled" | "deleted";
export type NotificationType = "follow" | "like" | "comment" | "reblog" | "message" | "mention";
export type LockStatus = "unlocked" | "restricted" | "banned";
export type ReportSubject = "minor_safety" | "non_consensual" | "harassment" | "spam" | "illegal" | "other";
export type ReportSource = "user_report" | "auto_moderation" | "promise_declined";
export type ReportStatus = "pending" | "reviewing" | "escalated" | "resolved_ban" | "resolved_restrict" | "resolved_dismissed";
export type FlagSubject = "minor_safety" | "non_consensual" | "harassment" | "spam" | "illegal" | "copyright" | "misinformation" | "other";
export type FlagStatus = "pending" | "reviewing" | "escalated" | "resolved_removed" | "resolved_flagged" | "resolved_dismissed";
export type AppealStatus = "pending" | "approved" | "denied" | "blocked";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type ExportStatus = "pending" | "processing" | "completed" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          header_url: string | null;
          bio: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
          show_likes: boolean;
          show_comments: boolean;
          show_followers: boolean;
          show_following: boolean;
          show_sensitive_posts: boolean;
          blur_sensitive_by_default: boolean;
          queue_enabled: boolean;
          queue_paused: boolean;
          queue_posts_per_day: number;
          queue_window_start: string;
          queue_window_end: string;
          role: number;
          lock_status: LockStatus;
          lock_reason: string | null;
          appeals_blocked: boolean;
          allow_asks: boolean;
          allow_anonymous_asks: boolean;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          header_url?: string | null;
          bio?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          show_likes?: boolean;
          show_comments?: boolean;
          show_followers?: boolean;
          show_following?: boolean;
          show_sensitive_posts?: boolean;
          blur_sensitive_by_default?: boolean;
          queue_enabled?: boolean;
          queue_paused?: boolean;
          queue_posts_per_day?: number;
          queue_window_start?: string;
          queue_window_end?: string;
          role?: number;
          lock_status?: LockStatus;
          lock_reason?: string | null;
          appeals_blocked?: boolean;
          allow_asks?: boolean;
          allow_anonymous_asks?: boolean;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          header_url?: string | null;
          bio?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          show_likes?: boolean;
          show_comments?: boolean;
          show_followers?: boolean;
          show_following?: boolean;
          show_sensitive_posts?: boolean;
          blur_sensitive_by_default?: boolean;
          queue_enabled?: boolean;
          queue_paused?: boolean;
          queue_posts_per_day?: number;
          queue_window_start?: string;
          queue_window_end?: string;
          role?: number;
          lock_status?: LockStatus;
          lock_reason?: string | null;
          appeals_blocked?: boolean;
          allow_asks?: boolean;
          allow_anonymous_asks?: boolean;
        };
      };
      profile_links: {
        Row: {
          id: string;
          profile_id: string;
          title: string;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          title: string;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          title?: string;
          url?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          post_type: PostType;
          status: PostStatus;
          content: Json;
          is_sensitive: boolean;
          original_post_id: string | null;
          reblogged_from_id: string | null;
          reblog_comment_html: string | null;
          scheduled_for: string | null;
          queue_position: number | null;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          post_type: PostType;
          status?: PostStatus;
          content: Json;
          is_sensitive?: boolean;
          original_post_id?: string | null;
          reblogged_from_id?: string | null;
          reblog_comment_html?: string | null;
          scheduled_for?: string | null;
          queue_position?: number | null;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          author_id?: string;
          post_type?: PostType;
          status?: PostStatus;
          content?: Json;
          is_sensitive?: boolean;
          original_post_id?: string | null;
          reblogged_from_id?: string | null;
          reblog_comment_html?: string | null;
          scheduled_for?: string | null;
          queue_position?: number | null;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          post_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          post_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          post_count?: number;
          created_at?: string;
        };
      };
      post_tags: {
        Row: {
          post_id: string;
          tag_id: string;
        };
        Insert: {
          post_id: string;
          tag_id: string;
        };
        Update: {
          post_id?: string;
          tag_id?: string;
        };
      };
      followed_tags: {
        Row: {
          profile_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          tag_id?: string;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          content_html: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          content_html: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          content_html?: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          profile_id: string;
          last_read_at: string | null;
        };
        Insert: {
          conversation_id: string;
          profile_id: string;
          last_read_at?: string | null;
        };
        Update: {
          conversation_id?: string;
          profile_id?: string;
          last_read_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          media_url: string | null;
          media_type: string | null;
          is_deleted: boolean;
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          media_url?: string | null;
          media_type?: string | null;
          is_deleted?: boolean;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string | null;
          media_url?: string | null;
          media_type?: string | null;
          is_deleted?: boolean;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      typing_indicators: {
        Row: {
          conversation_id: string;
          profile_id: string;
          started_at: string;
        };
        Insert: {
          conversation_id: string;
          profile_id: string;
          started_at?: string;
        };
        Update: {
          conversation_id?: string;
          profile_id?: string;
          started_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          notification_type: NotificationType;
          post_id: string | null;
          comment_id: string | null;
          message_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          notification_type: NotificationType;
          post_id?: string | null;
          comment_id?: string | null;
          message_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          notification_type?: NotificationType;
          post_id?: string | null;
          comment_id?: string | null;
          message_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };
      mutes: {
        Row: {
          muter_id: string;
          muted_id: string;
          created_at: string;
        };
        Insert: {
          muter_id: string;
          muted_id: string;
          created_at?: string;
        };
        Update: {
          muter_id?: string;
          muted_id?: string;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string | null;
          reported_user_id: string;
          post_id: string | null;
          subject: ReportSubject;
          comments: string | null;
          source: ReportSource;
          status: ReportStatus;
          assigned_to: string | null;
          assigned_role: number;
          escalated_from: string | null;
          escalated_by: string | null;
          escalated_at: string | null;
          escalation_reason: string | null;
          resolved_by: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id?: string | null;
          reported_user_id: string;
          post_id?: string | null;
          subject: ReportSubject;
          comments?: string | null;
          source?: ReportSource;
          status?: ReportStatus;
          assigned_to?: string | null;
          assigned_role?: number;
          escalated_from?: string | null;
          escalated_by?: string | null;
          escalated_at?: string | null;
          escalation_reason?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string | null;
          reported_user_id?: string;
          post_id?: string | null;
          subject?: ReportSubject;
          comments?: string | null;
          source?: ReportSource;
          status?: ReportStatus;
          assigned_to?: string | null;
          assigned_role?: number;
          escalated_from?: string | null;
          escalated_by?: string | null;
          escalated_at?: string | null;
          escalation_reason?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      flags: {
        Row: {
          id: string;
          flagger_id: string | null;
          post_id: string;
          subject: FlagSubject;
          comments: string | null;
          status: FlagStatus;
          assigned_to: string | null;
          assigned_role: number;
          escalated_from: string | null;
          escalated_by: string | null;
          escalated_at: string | null;
          escalation_reason: string | null;
          resolved_by: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          flagger_id?: string | null;
          post_id: string;
          subject: FlagSubject;
          comments?: string | null;
          status?: FlagStatus;
          assigned_to?: string | null;
          assigned_role?: number;
          escalated_from?: string | null;
          escalated_by?: string | null;
          escalated_at?: string | null;
          escalation_reason?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          flagger_id?: string | null;
          post_id?: string;
          subject?: FlagSubject;
          comments?: string | null;
          status?: FlagStatus;
          assigned_to?: string | null;
          assigned_role?: number;
          escalated_from?: string | null;
          escalated_by?: string | null;
          escalated_at?: string | null;
          escalation_reason?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appeals: {
        Row: {
          id: string;
          user_id: string;
          report_id: string | null;
          reason: string;
          status: AppealStatus;
          reviewed_by: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_id?: string | null;
          reason: string;
          status?: AppealStatus;
          reviewed_by?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_id?: string | null;
          reason?: string;
          status?: AppealStatus;
          reviewed_by?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
      };
      escalation_history: {
        Row: {
          id: string;
          report_id: string | null;
          flag_id: string | null;
          from_role: number;
          to_role: number;
          escalated_by: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id?: string | null;
          flag_id?: string | null;
          from_role: number;
          to_role: number;
          escalated_by: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string | null;
          flag_id?: string | null;
          from_role?: number;
          to_role?: number;
          escalated_by?: string;
          reason?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_next_queue_position: {
        Args: { p_user_id: string };
        Returns: number;
      };
    };
    Enums: {
      post_type: PostType;
      post_status: PostStatus;
      notification_type: NotificationType;
    };
  };
}

// Helper types for easier usage
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
  url: string;
  album_art_url?: string;
  spotify_data?: {
    track_id: string;
    name: string;
    artist: string;
    album: string;
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
