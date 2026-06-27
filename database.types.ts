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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          created_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      bookmark_collections: {
        Row: {
          id: string
          user_id: string
          name: string | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string | null
          description?: string | null
          created_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      communities: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          banner_url: string | null
          icon_url: string | null
          visibility: string | null
          join_policy: string | null
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
          visibility?: string | null
          join_policy?: string | null
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
          visibility?: string | null
          join_policy?: string | null
          nsfw?: boolean
          created_by?: string
          member_count?: number
          post_count?: number
          created_at?: string
        }
        Relationships: []
      }
      community_join_requests: {
        Row: {
          id: string
          community_id: string
          user_id: string
          message: string | null
          status: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          message?: string | null
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          message?: string | null
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          user_id: string
          role: string | null
          joined_at: string
        }
        Insert: {
          community_id: string
          user_id: string
          role?: string | null
          joined_at?: string
        }
        Update: {
          community_id?: string
          user_id?: string
          role?: string | null
          joined_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          profile_id: string
          last_read_at: string | null
        }
        Insert: {
          conversation_id: string
          profile_id: string
          last_read_at?: string | null
        }
        Update: {
          conversation_id?: string
          profile_id?: string
          last_read_at?: string | null
        }
        Relationships: []
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
          status: string | null
          file_url: string | null
          file_size_bytes: number | null
          expires_at: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: string | null
          file_url?: string | null
          file_size_bytes?: number | null
          expires_at?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string | null
          file_url?: string | null
          file_size_bytes?: number | null
          expires_at?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      email_sends: {
        Row: {
          id: string
          template_type: string | null
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
          template_type?: string | null
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
          template_type?: string | null
          subject?: string
          recipient_count?: number
          sent_by?: string | null
          recipient_filter?: Json | null
          custom_content?: Json | null
          created_at?: string | null
          completed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      email_template_customizations: {
        Row: {
          id: string
          template_type: string | null
          customizations: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          template_type?: string | null
          customizations?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          template_type?: string | null
          customizations?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      flags: {
        Row: {
          id: string
          flagger_id: string | null
          post_id: string
          subject: string | null
          comments: string | null
          status: string | null
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
          subject?: string | null
          comments?: string | null
          status?: string | null
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
          subject?: string | null
          comments?: string | null
          status?: string | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          notification_type: string | null
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
          notification_type?: string | null
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
          notification_type?: string | null
          post_id?: string | null
          comment_id?: string | null
          message_id?: string | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      pending_digest_notifications: {
        Row: {
          id: string
          recipient_id: string
          notification_type: string | null
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
          notification_type?: string | null
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
          notification_type?: string | null
          actor_id?: string | null
          post_id?: string | null
          comment_id?: string | null
          message_preview?: string | null
          conversation_id?: string | null
          created_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          author_id: string
          post_type: string | null
          status: string | null
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
          moderation_status: string | null
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
          post_type?: string | null
          status?: string | null
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
          moderation_status?: string | null
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
          post_type?: string | null
          status?: string | null
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
          moderation_status?: string | null
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
        Relationships: []
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
        Relationships: []
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
          lock_status: string | null
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
          email_frequency: string | null
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
          lock_status?: string | null
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
          email_frequency?: string | null
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
          lock_status?: string | null
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
          email_frequency?: string | null
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
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string | null
          reported_user_id: string | null
          post_id: string | null
          subject: string | null
          comments: string | null
          source: string | null
          status: string | null
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
          subject?: string | null
          comments?: string | null
          source?: string | null
          status?: string | null
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
          subject?: string | null
          comments?: string | null
          source?: string | null
          status?: string | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
    }
    Functions: {
      generate_invite_code: {
        Args: {
        }
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
