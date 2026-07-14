export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.12"
  }
  public: {
    Tables: {
      appeals: {
        Row: {
          id: string
          user_id: string
          report_id: string | null
          reason: string
          status: Database["public"]["Enums"]["appeal_status"] | null
          reviewed_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          report_id?: string | null
          reason: string
          status?: Database["public"]["Enums"]["appeal_status"] | null
          reviewed_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          report_id?: string | null
          reason?: string
          status?: Database["public"]["Enums"]["appeal_status"] | null
          reviewed_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asks: {
        Row: {
          id: string
          recipient_id: string
          sender_id: string | null
          question: string
          is_anonymous: boolean
          status: string
          answered_post_id: string | null
          created_at: string | null
          updated_at: string | null
          question_audio_url: string | null
          question_audio_duration: number | null
          answer_audio_url: string | null
          answer_audio_duration: number | null
        }
        Insert: {
          id?: string
          recipient_id: string
          sender_id?: string | null
          question: string
          is_anonymous?: boolean
          status?: string
          answered_post_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          question_audio_url?: string | null
          question_audio_duration?: number | null
          answer_audio_url?: string | null
          answer_audio_duration?: number | null
        }
        Update: {
          id?: string
          recipient_id?: string
          sender_id?: string | null
          question?: string
          is_anonymous?: boolean
          status?: string
          answered_post_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          question_audio_url?: string | null
          question_audio_duration?: number | null
          answer_audio_url?: string | null
          answer_audio_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asks_answered_post_id_fkey"
            columns: ["answered_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asks_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_username: string | null
          actor_role: number
          action: string
          target_user_id: string | null
          target_user_username: string | null
          target_post_id: string | null
          target_report_id: string | null
          target_flag_id: string | null
          target_appeal_id: string | null
          details: Json | null
          ip_address: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_username?: string | null
          actor_role: number
          action: string
          target_user_id?: string | null
          target_user_username?: string | null
          target_post_id?: string | null
          target_report_id?: string | null
          target_flag_id?: string | null
          target_appeal_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_username?: string | null
          actor_role?: number
          action?: string
          target_user_id?: string | null
          target_user_username?: string | null
          target_post_id?: string | null
          target_report_id?: string | null
          target_flag_id?: string | null
          target_appeal_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_ips: {
        Row: {
          id: string
          ip_address: string
          user_id: string | null
          reason: string | null
          banned_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          ip_address: string
          user_id?: string | null
          reason?: string | null
          banned_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          ip_address?: string
          user_id?: string | null
          reason?: string | null
          banned_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banned_ips_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banned_ips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string | null
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string | null
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmark_collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookmark_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
          collection_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
          collection_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
          collection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "bookmark_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          id: string
          user_id: string
          post_id: string
          content_html: string | null
          parent_id: string | null
          created_at: string | null
          updated_at: string | null
          audio_url: string | null
          audio_duration: number | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          content_html?: string | null
          parent_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          audio_url?: string | null
          audio_duration?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          content_html?: string | null
          parent_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          audio_url?: string | null
          audio_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          banner_url: string | null
          icon_url: string | null
          visibility: Database["public"]["Enums"]["community_visibility"]
          join_policy: Database["public"]["Enums"]["community_join_policy"]
          nsfw: boolean
          created_by: string
          member_count: number
          post_count: number
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          banner_url?: string | null
          icon_url?: string | null
          visibility?: Database["public"]["Enums"]["community_visibility"]
          join_policy?: Database["public"]["Enums"]["community_join_policy"]
          nsfw?: boolean
          created_by: string
          member_count?: number
          post_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          banner_url?: string | null
          icon_url?: string | null
          visibility?: Database["public"]["Enums"]["community_visibility"]
          join_policy?: Database["public"]["Enums"]["community_join_policy"]
          nsfw?: boolean
          created_by?: string
          member_count?: number
          post_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_requests: {
        Row: {
          id: string
          community_id: string
          user_id: string
          message: string | null
          status: Database["public"]["Enums"]["community_join_request_status"]
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          message?: string | null
          status?: Database["public"]["Enums"]["community_join_request_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["community_join_request_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          user_id: string
          role: Database["public"]["Enums"]["community_member_role"]
          joined_at: string
        }
        Insert: {
          community_id: string
          user_id: string
          role?: Database["public"]["Enums"]["community_member_role"]
          joined_at?: string
        }
        Update: {
          community_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["community_member_role"]
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          community_id: string
          post_id: string
          added_by: string
          pinned: boolean
          added_at: string
        }
        Insert: {
          community_id: string
          post_id: string
          added_by: string
          pinned?: boolean
          added_at?: string
        }
        Update: {
          community_id?: string
          post_id?: string
          added_by?: string
          pinned?: boolean
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rules: {
        Row: {
          id: string
          community_id: string
          position: number
          title: string
          body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          position?: number
          title: string
          body?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          position?: number
          title?: string
          body?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rules_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          profile_id: string
          last_read_at: string | null
          is_muted: boolean
        }
        Insert: {
          conversation_id: string
          profile_id: string
          last_read_at?: string | null
          is_muted?: boolean
        }
        Update: {
          conversation_id?: string
          profile_id?: string
          last_read_at?: string | null
          is_muted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          id: string
          user_id: string
          status: Database["public"]["Enums"]["export_status"] | null
          file_url: string | null
          file_size_bytes: number | null
          expires_at: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: Database["public"]["Enums"]["export_status"] | null
          file_url?: string | null
          file_size_bytes?: number | null
          expires_at?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: Database["public"]["Enums"]["export_status"] | null
          file_url?: string | null
          file_size_bytes?: number | null
          expires_at?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_export_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_recipients: {
        Row: {
          id: string
          email_send_id: string
          recipient_id: string
          email_address: string
          status: string | null
          sent_at: string | null
          error: string | null
        }
        Insert: {
          id?: string
          email_send_id: string
          recipient_id: string
          email_address: string
          status?: string | null
          sent_at?: string | null
          error?: string | null
        }
        Update: {
          id?: string
          email_send_id?: string
          recipient_id?: string
          email_address?: string
          status?: string | null
          sent_at?: string | null
          error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_recipients_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          id: string
          template_type: Database["public"]["Enums"]["email_template_type"]
          subject: string
          recipient_count: number
          sent_by: string | null
          recipient_filter: Json | null
          custom_content: Json | null
          created_at: string | null
          completed_at: string | null
          status: string | null
        }
        Insert: {
          id?: string
          template_type: Database["public"]["Enums"]["email_template_type"]
          subject: string
          recipient_count?: number
          sent_by?: string | null
          recipient_filter?: Json | null
          custom_content?: Json | null
          created_at?: string | null
          completed_at?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          template_type?: Database["public"]["Enums"]["email_template_type"]
          subject?: string
          recipient_count?: number
          sent_by?: string | null
          recipient_filter?: Json | null
          custom_content?: Json | null
          created_at?: string | null
          completed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_customizations: {
        Row: {
          id: string
          template_type: Database["public"]["Enums"]["email_template_type"]
          customizations: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          template_type: Database["public"]["Enums"]["email_template_type"]
          customizations?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          template_type?: Database["public"]["Enums"]["email_template_type"]
          customizations?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_template_customizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_history: {
        Row: {
          id: string
          report_id: string | null
          flag_id: string | null
          from_role: number
          to_role: number
          escalated_by: string
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          report_id?: string | null
          flag_id?: string | null
          from_role: number
          to_role: number
          escalated_by: string
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string | null
          flag_id?: string | null
          from_role?: number
          to_role?: number
          escalated_by?: string
          reason?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_history_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          id: string
          flagger_id: string | null
          post_id: string
          subject: Database["public"]["Enums"]["flag_subject"]
          comments: string | null
          status: Database["public"]["Enums"]["flag_status"] | null
          assigned_to: string | null
          assigned_role: number | null
          escalated_from: string | null
          escalated_by: string | null
          escalated_at: string | null
          escalation_reason: string | null
          resolved_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          flagger_id?: string | null
          post_id: string
          subject: Database["public"]["Enums"]["flag_subject"]
          comments?: string | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          assigned_to?: string | null
          assigned_role?: number | null
          escalated_from?: string | null
          escalated_by?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          flagger_id?: string | null
          post_id?: string
          subject?: Database["public"]["Enums"]["flag_subject"]
          comments?: string | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          assigned_to?: string | null
          assigned_role?: number | null
          escalated_from?: string | null
          escalated_by?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flags_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_escalated_from_fkey"
            columns: ["escalated_from"]
            isOneToOne: false
            referencedRelation: "flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_flagger_id_fkey"
            columns: ["flagger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      followed_tags: {
        Row: {
          profile_id: string
          tag_id: string
          created_at: string | null
        }
        Insert: {
          profile_id: string
          tag_id: string
          created_at?: string | null
        }
        Update: {
          profile_id?: string
          tag_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followed_tags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followed_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_code_uses: {
        Row: {
          id: string
          code_id: string
          user_id: string
          used_at: string | null
        }
        Insert: {
          id?: string
          code_id: string
          user_id: string
          used_at?: string | null
        }
        Update: {
          id?: string
          code_id?: string
          user_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          id: string
          code: string
          creator_id: string | null
          max_uses: number | null
          uses: number | null
          expires_at: string | null
          is_revoked: boolean | null
          revoked_at: string | null
          revoked_by: string | null
          note: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          code: string
          creator_id?: string | null
          max_uses?: number | null
          uses?: number | null
          expires_at?: string | null
          is_revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          creator_id?: string | null
          max_uses?: number | null
          uses?: number | null
          expires_at?: string | null
          is_revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_email_tracking: {
        Row: {
          id: string
          recipient_id: string
          sender_id: string
          conversation_id: string
          last_email_sent_at: string
          is_new_conversation: boolean | null
        }
        Insert: {
          id?: string
          recipient_id: string
          sender_id: string
          conversation_id: string
          last_email_sent_at?: string
          is_new_conversation?: boolean | null
        }
        Update: {
          id?: string
          recipient_id?: string
          sender_id?: string
          conversation_id?: string
          last_email_sent_at?: string
          is_new_conversation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "message_email_tracking_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_email_tracking_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string | null
          media_url: string | null
          media_type: string | null
          is_deleted: boolean | null
          is_edited: boolean | null
          created_at: string | null
          updated_at: string | null
          reply_to_id: string | null
          media_duration: number | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          reply_to_id?: string | null
          media_duration?: number | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          reply_to_id?: string | null
          media_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_post_notifications: {
        Row: {
          user_id: string
          post_id: string
          created_at: string | null
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string | null
        }
        Update: {
          user_id?: string
          post_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "muted_post_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muted_post_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_tags: {
        Row: {
          profile_id: string
          tag_id: string
          created_at: string | null
        }
        Insert: {
          profile_id: string
          tag_id: string
          created_at?: string | null
        }
        Update: {
          profile_id?: string
          tag_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "muted_tags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muted_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      mutes: {
        Row: {
          muter_id: string
          muted_id: string
          created_at: string | null
        }
        Insert: {
          muter_id: string
          muted_id: string
          created_at?: string | null
        }
        Update: {
          muter_id?: string
          muted_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          post_id: string | null
          comment_id: string | null
          message_id: string | null
          is_read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          post_id?: string | null
          comment_id?: string | null
          message_id?: string | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          post_id?: string | null
          comment_id?: string | null
          message_id?: string | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_digest_notifications: {
        Row: {
          id: string
          recipient_id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          actor_id: string | null
          post_id: string | null
          comment_id: string | null
          message_preview: string | null
          conversation_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          recipient_id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          actor_id?: string | null
          post_id?: string | null
          comment_id?: string | null
          message_preview?: string | null
          conversation_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          recipient_id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          actor_id?: string | null
          post_id?: string | null
          comment_id?: string | null
          message_preview?: string | null
          conversation_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_digest_notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_digest_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_digest_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          option_index: number
          created_at: string | null
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          option_index: number
          created_at?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          option_index?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_audio_reactions: {
        Row: {
          id: string
          post_id: string
          user_id: string
          audio_url: string
          duration: number | null
          transcript: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          audio_url: string
          duration?: number | null
          transcript?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          audio_url?: string
          duration?: number | null
          transcript?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_audio_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_audio_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          id: string
          author_id: string
          post_type: Database["public"]["Enums"]["post_type"]
          status: Database["public"]["Enums"]["post_status"] | null
          content: Json
          is_sensitive: boolean | null
          original_post_id: string | null
          reblogged_from_id: string | null
          reblog_comment_html: string | null
          scheduled_for: string | null
          queue_position: number | null
          is_pinned: boolean | null
          created_at: string | null
          updated_at: string | null
          published_at: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"] | null
          moderation_reason: string | null
          moderated_at: string | null
          moderated_by: string | null
          thread_id: string | null
          thread_position: number | null
          pending_community_ids: string[] | null
          published_from_queue: boolean
          exclude_from_public: boolean
          like_count: number
          comment_count: number
          reblog_count: number
        }
        Insert: {
          id?: string
          author_id: string
          post_type: Database["public"]["Enums"]["post_type"]
          status?: Database["public"]["Enums"]["post_status"] | null
          content: Json
          is_sensitive?: boolean | null
          original_post_id?: string | null
          reblogged_from_id?: string | null
          reblog_comment_html?: string | null
          scheduled_for?: string | null
          queue_position?: number | null
          is_pinned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          published_at?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"] | null
          moderation_reason?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          thread_id?: string | null
          thread_position?: number | null
          pending_community_ids?: string[] | null
          published_from_queue?: boolean
          exclude_from_public?: boolean
          like_count?: number
          comment_count?: number
          reblog_count?: number
        }
        Update: {
          id?: string
          author_id?: string
          post_type?: Database["public"]["Enums"]["post_type"]
          status?: Database["public"]["Enums"]["post_status"] | null
          content?: Json
          is_sensitive?: boolean | null
          original_post_id?: string | null
          reblogged_from_id?: string | null
          reblog_comment_html?: string | null
          scheduled_for?: string | null
          queue_position?: number | null
          is_pinned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          published_at?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"] | null
          moderation_reason?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          thread_id?: string | null
          thread_position?: number | null
          pending_community_ids?: string[] | null
          published_from_queue?: boolean
          exclude_from_public?: boolean
          like_count?: number
          comment_count?: number
          reblog_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_original_post_id_fkey"
            columns: ["original_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reblogged_from_id_fkey"
            columns: ["reblogged_from_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_links: {
        Row: {
          id: string
          profile_id: string
          title: string
          url: string
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          url: string
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          url?: string
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          header_url: string | null
          bio: string | null
          timezone: string | null
          created_at: string | null
          updated_at: string | null
          show_likes: boolean | null
          show_comments: boolean | null
          show_followers: boolean | null
          show_following: boolean | null
          show_sensitive_posts: boolean | null
          blur_sensitive_by_default: boolean | null
          queue_enabled: boolean | null
          queue_paused: boolean | null
          queue_posts_per_day: number | null
          queue_window_start: string | null
          queue_window_end: string | null
          email_notifications: Json | null
          onboarding_completed: boolean | null
          is_verified: boolean | null
          verified_at: string | null
          role: number | null
          lock_status: Database["public"]["Enums"]["lock_status"] | null
          promise_accepted_at: string | null
          banned_at: string | null
          ban_reason: string | null
          appeals_blocked: boolean | null
          email_likes: boolean | null
          email_comments: boolean | null
          email_reblogs: boolean | null
          email_follows: boolean | null
          email_mentions: boolean | null
          email_messages: boolean | null
          email_frequency: Database["public"]["Enums"]["email_frequency"] | null
          last_message_email_at: string | null
          allow_asks: boolean
          allow_anonymous_asks: boolean
          invited_by: string | null
          invite_code_used: string | null
          invite_codes_remaining: number | null
          accent_color: string | null
          feed_layout: string
          is_discoverable: boolean
          allow_search_indexing: boolean
          follower_count: number
          is_searchable: boolean
          is_nsfw: boolean
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          header_url?: string | null
          bio?: string | null
          timezone?: string | null
          created_at?: string | null
          updated_at?: string | null
          show_likes?: boolean | null
          show_comments?: boolean | null
          show_followers?: boolean | null
          show_following?: boolean | null
          show_sensitive_posts?: boolean | null
          blur_sensitive_by_default?: boolean | null
          queue_enabled?: boolean | null
          queue_paused?: boolean | null
          queue_posts_per_day?: number | null
          queue_window_start?: string | null
          queue_window_end?: string | null
          email_notifications?: Json | null
          onboarding_completed?: boolean | null
          is_verified?: boolean | null
          verified_at?: string | null
          role?: number | null
          lock_status?: Database["public"]["Enums"]["lock_status"] | null
          promise_accepted_at?: string | null
          banned_at?: string | null
          ban_reason?: string | null
          appeals_blocked?: boolean | null
          email_likes?: boolean | null
          email_comments?: boolean | null
          email_reblogs?: boolean | null
          email_follows?: boolean | null
          email_mentions?: boolean | null
          email_messages?: boolean | null
          email_frequency?: Database["public"]["Enums"]["email_frequency"] | null
          last_message_email_at?: string | null
          allow_asks?: boolean
          allow_anonymous_asks?: boolean
          invited_by?: string | null
          invite_code_used?: string | null
          invite_codes_remaining?: number | null
          accent_color?: string | null
          feed_layout?: string
          is_discoverable?: boolean
          allow_search_indexing?: boolean
          follower_count?: number
          is_searchable?: boolean
          is_nsfw?: boolean
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          header_url?: string | null
          bio?: string | null
          timezone?: string | null
          created_at?: string | null
          updated_at?: string | null
          show_likes?: boolean | null
          show_comments?: boolean | null
          show_followers?: boolean | null
          show_following?: boolean | null
          show_sensitive_posts?: boolean | null
          blur_sensitive_by_default?: boolean | null
          queue_enabled?: boolean | null
          queue_paused?: boolean | null
          queue_posts_per_day?: number | null
          queue_window_start?: string | null
          queue_window_end?: string | null
          email_notifications?: Json | null
          onboarding_completed?: boolean | null
          is_verified?: boolean | null
          verified_at?: string | null
          role?: number | null
          lock_status?: Database["public"]["Enums"]["lock_status"] | null
          promise_accepted_at?: string | null
          banned_at?: string | null
          ban_reason?: string | null
          appeals_blocked?: boolean | null
          email_likes?: boolean | null
          email_comments?: boolean | null
          email_reblogs?: boolean | null
          email_follows?: boolean | null
          email_mentions?: boolean | null
          email_messages?: boolean | null
          email_frequency?: Database["public"]["Enums"]["email_frequency"] | null
          last_message_email_at?: string | null
          allow_asks?: boolean
          allow_anonymous_asks?: boolean
          invited_by?: string | null
          invite_code_used?: string | null
          invite_codes_remaining?: number | null
          accent_color?: string | null
          feed_layout?: string
          is_discoverable?: boolean
          allow_search_indexing?: boolean
          follower_count?: number
          is_searchable?: boolean
          is_nsfw?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invite_code_used_fkey"
            columns: ["invite_code_used"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string | null
          reported_user_id: string | null
          post_id: string | null
          subject: Database["public"]["Enums"]["report_subject"]
          comments: string | null
          source: Database["public"]["Enums"]["report_source"] | null
          status: Database["public"]["Enums"]["report_status"] | null
          assigned_to: string | null
          resolved_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          created_at: string | null
          updated_at: string | null
          assigned_role: number | null
          escalated_from: string | null
          escalated_by: string | null
          escalated_at: string | null
          escalation_reason: string | null
        }
        Insert: {
          id?: string
          reporter_id?: string | null
          reported_user_id?: string | null
          post_id?: string | null
          subject: Database["public"]["Enums"]["report_subject"]
          comments?: string | null
          source?: Database["public"]["Enums"]["report_source"] | null
          status?: Database["public"]["Enums"]["report_status"] | null
          assigned_to?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          assigned_role?: number | null
          escalated_from?: string | null
          escalated_by?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string | null
          reported_user_id?: string | null
          post_id?: string | null
          subject?: Database["public"]["Enums"]["report_subject"]
          comments?: string | null
          source?: Database["public"]["Enums"]["report_source"] | null
          status?: Database["public"]["Enums"]["report_status"] | null
          assigned_to?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          assigned_role?: number | null
          escalated_from?: string | null
          escalated_by?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_escalated_from_fkey"
            columns: ["escalated_from"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          post_count: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          post_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          post_count?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      tips: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          amount: number
          message: string | null
          status: string
          paddle_transaction_id: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id: string
          sender_id: string
          recipient_id: string
          amount: number
          message?: string | null
          status?: string
          paddle_transaction_id?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          amount?: number
          message?: string | null
          status?: string
          paddle_transaction_id?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          profile_id: string
          started_at: string | null
        }
        Insert: {
          conversation_id: string
          profile_id: string
          started_at?: string | null
        }
        Update: {
          conversation_id?: string
          profile_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tag_assignments: {
        Row: {
          user_id: string
          tag_id: string
          assigned_at: string | null
          assigned_by: string | null
        }
        Insert: {
          user_id: string
          tag_id: string
          assigned_at?: string | null
          assigned_by?: string | null
        }
        Update: {
          user_id?: string
          tag_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tag_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "user_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tag_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tags: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      verifications: {
        Row: {
          id: string
          user_id: string
          amount: number
          status: string
          paddle_transaction_id: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id: string
          user_id: string
          amount: number
          status?: string
          paddle_transaction_id?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          status?: string
          paddle_transaction_id?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
    }
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_queue_position: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      is_community_member: {
        Args: {
          p_community_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_community_moderator: {
        Args: {
          p_community_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_community_owner: {
        Args: {
          p_community_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: {
          conv_id: string
        }
        Returns: boolean
      }
      use_invite_code: {
        Args: {
          p_code: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      appeal_status: "pending" | "approved" | "denied" | "blocked"
      community_join_policy: "open" | "request" | "invite_only"
      community_join_request_status: "pending" | "approved" | "rejected"
      community_member_role: "member" | "moderator" | "owner"
      community_visibility: "public" | "restricted" | "private"
      email_frequency: "immediate" | "daily" | "off"
      email_template_type: "announcement" | "founder_message" | "welcome" | "magic_link" | "password_reset" | "follow" | "like" | "comment" | "reblog" | "message" | "mention" | "digest"
      export_status: "pending" | "processing" | "completed" | "failed" | "expired"
      flag_status: "pending" | "reviewing" | "escalated" | "resolved_removed" | "resolved_flagged" | "resolved_dismissed"
      flag_subject: "minor_safety" | "non_consensual" | "harassment" | "spam" | "illegal" | "copyright" | "misinformation" | "other"
      lock_status: "unlocked" | "restricted" | "banned"
      moderation_status: "pending" | "approved" | "flagged" | "removed"
      notification_type: "follow" | "like" | "comment" | "reblog" | "message" | "mention" | "ask" | "ask_answered" | "moderation" | "appeal" | "tip" | "system"
      post_status: "draft" | "published" | "queued" | "scheduled" | "deleted"
      post_type: "text" | "image" | "video" | "audio" | "gallery" | "poll" | "ask"
      report_source: "user_report" | "auto_moderation" | "promise_declined"
      report_status: "pending" | "reviewing" | "escalated" | "resolved_ban" | "resolved_restrict" | "resolved_dismissed" | "resolved_approved"
      report_subject: "minor_safety" | "non_consensual" | "harassment" | "spam" | "illegal" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appeal_status: ["pending", "approved", "denied", "blocked"],
      community_join_policy: ["open", "request", "invite_only"],
      community_join_request_status: ["pending", "approved", "rejected"],
      community_member_role: ["member", "moderator", "owner"],
      community_visibility: ["public", "restricted", "private"],
      email_frequency: ["immediate", "daily", "off"],
      email_template_type: ["announcement", "founder_message", "welcome", "magic_link", "password_reset", "follow", "like", "comment", "reblog", "message", "mention", "digest"],
      export_status: ["pending", "processing", "completed", "failed", "expired"],
      flag_status: ["pending", "reviewing", "escalated", "resolved_removed", "resolved_flagged", "resolved_dismissed"],
      flag_subject: ["minor_safety", "non_consensual", "harassment", "spam", "illegal", "copyright", "misinformation", "other"],
      lock_status: ["unlocked", "restricted", "banned"],
      moderation_status: ["pending", "approved", "flagged", "removed"],
      notification_type: ["follow", "like", "comment", "reblog", "message", "mention", "ask", "ask_answered", "moderation", "appeal", "tip", "system"],
      post_status: ["draft", "published", "queued", "scheduled", "deleted"],
      post_type: ["text", "image", "video", "audio", "gallery", "poll", "ask"],
      report_source: ["user_report", "auto_moderation", "promise_declined"],
      report_status: ["pending", "reviewing", "escalated", "resolved_ban", "resolved_restrict", "resolved_dismissed", "resolved_approved"],
      report_subject: ["minor_safety", "non_consensual", "harassment", "spam", "illegal", "other"],
    },
  },
} as const
