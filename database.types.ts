export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12"
  }
  public: {
    Tables: {
      blocked_users: {
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
      comment_edit_history: {
        Row: {
          id: string
          comment_id: string
          previous_content: string
          edited_at: string | null
        }
        Insert: {
          id?: string
          comment_id: string
          previous_content: string
          edited_at?: string | null
        }
        Update: {
          id?: string
          comment_id?: string
          previous_content?: string
          edited_at?: string | null
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          type: string
          created_at: string | null
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          type: string
          created_at?: string | null
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          type?: string
          created_at?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          avatar_url: string | null
          cover_url: string | null
          cover_position: Json | null
          is_nsfw: boolean | null
          rules: Json | null
          join_type: string | null
          join_fee: number | null
          member_count: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          cover_position?: Json | null
          is_nsfw?: boolean | null
          rules?: Json | null
          join_type?: string | null
          join_fee?: number | null
          member_count?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          cover_position?: Json | null
          is_nsfw?: boolean | null
          rules?: Json | null
          join_type?: string | null
          join_fee?: number | null
          member_count?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      community_join_requests: {
        Row: {
          community_id: string
          user_id: string
          requested_at: string
          message: string | null
        }
        Insert: {
          community_id: string
          user_id: string
          requested_at?: string
          message?: string | null
        }
        Update: {
          community_id?: string
          user_id?: string
          requested_at?: string
          message?: string | null
        }
        Relationships: []
      }
      community_members: {
        Row: {
          user_id: string
          community_id: string
          role: string | null
          show_in_feed: boolean | null
          joined_at: string | null
        }
        Insert: {
          user_id: string
          community_id: string
          role?: string | null
          show_in_feed?: boolean | null
          joined_at?: string | null
        }
        Update: {
          user_id?: string
          community_id?: string
          role?: string | null
          show_in_feed?: boolean | null
          joined_at?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
          last_read_at: string | null
          joined_at: string | null
        }
        Insert: {
          conversation_id: string
          user_id: string
          last_read_at?: string | null
          joined_at?: string | null
        }
        Update: {
          conversation_id?: string
          user_id?: string
          last_read_at?: string | null
          joined_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          title: string | null
          is_group: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      flag_appeals: {
        Row: {
          id: string
          resolution_id: string
          appealed_by: string
          reason: string
          status: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          resolution_id: string
          appealed_by: string
          reason: string
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          resolution_id?: string
          appealed_by?: string
          reason?: string
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string | null
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string | null
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string | null
        }
        Relationships: []
      }
      fragment_comments: {
        Row: {
          id: string
          fragment_id: string
          user_id: string
          parent_id: string | null
          content: string
          is_edited: boolean | null
          deleted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          fragment_id: string
          user_id: string
          parent_id?: string | null
          content: string
          is_edited?: boolean | null
          deleted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          fragment_id?: string
          user_id?: string
          parent_id?: string | null
          content?: string
          is_edited?: boolean | null
          deleted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fragment_flag_resolutions: {
        Row: {
          id: string
          fragment_id: string
          status: string | null
          action_taken: string | null
          flag_count: number | null
          priority: string | null
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          fragment_id: string
          status?: string | null
          action_taken?: string | null
          flag_count?: number | null
          priority?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          fragment_id?: string
          status?: string | null
          action_taken?: string | null
          flag_count?: number | null
          priority?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fragment_flags: {
        Row: {
          id: string
          reporter_id: string
          fragment_id: string
          reason: string
          details: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          reporter_id: string
          fragment_id: string
          reason: string
          details?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string
          fragment_id?: string
          reason?: string
          details?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      fragment_reaction_types: {
        Row: {
          id: string
          type: string
          emoji: string | null
          display_order: number | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          type: string
          emoji?: string | null
          display_order?: number | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          type?: string
          emoji?: string | null
          display_order?: number | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      fragment_reactions: {
        Row: {
          id: string
          fragment_id: string
          user_id: string
          type: string
          created_at: string | null
        }
        Insert: {
          id?: string
          fragment_id: string
          user_id: string
          type: string
          created_at?: string | null
        }
        Update: {
          id?: string
          fragment_id?: string
          user_id?: string
          type?: string
          created_at?: string | null
        }
        Relationships: []
      }
      fragments: {
        Row: {
          id: string
          user_id: string
          community_id: string | null
          title: string | null
          content: string
          is_draft: boolean | null
          is_nsfw: boolean | null
          reactions_open: boolean | null
          comments_open: boolean | null
          deleted_at: string | null
          published_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          community_id?: string | null
          title?: string | null
          content: string
          is_draft?: boolean | null
          is_nsfw?: boolean | null
          reactions_open?: boolean | null
          comments_open?: boolean | null
          deleted_at?: string | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          community_id?: string | null
          title?: string | null
          content?: string
          is_draft?: boolean | null
          is_nsfw?: boolean | null
          reactions_open?: boolean | null
          comments_open?: boolean | null
          deleted_at?: string | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fragments_tags: {
        Row: {
          fragment_id: string
          tag_id: string
        }
        Insert: {
          fragment_id: string
          tag_id: string
        }
        Update: {
          fragment_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      images_moderation: {
        Row: {
          id: string
          image_url: string
          uploaded_by: string | null
          reported_by: string | null
          assigned_to: string | null
          reason: string
          risk_level: string
          status: string
          sightengine_data: Json | null
          admin_notes: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          image_url: string
          uploaded_by?: string | null
          reported_by?: string | null
          assigned_to?: string | null
          reason: string
          risk_level?: string
          status?: string
          sightengine_data?: Json | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          image_url?: string
          uploaded_by?: string | null
          reported_by?: string | null
          assigned_to?: string | null
          reason?: string
          risk_level?: string
          status?: string
          sightengine_data?: Json | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          message_id: string
          user_id: string
          emojis: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          message_id: string
          user_id: string
          emojis?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          message_id?: string
          user_id?: string
          emojis?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string | null
          content: string | null
          message_type: string | null
          is_deleted: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id?: string | null
          content?: string | null
          message_type?: string | null
          is_deleted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string | null
          content?: string | null
          message_type?: string | null
          is_deleted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      moderation_history: {
        Row: {
          id: string
          moderator_id: string
          action_type: string
          fragment_id: string | null
          user_id: string | null
          flag_id: string | null
          report_id: string | null
          resolution_id: string | null
          appeal_id: string | null
          action_details: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          moderator_id: string
          action_type: string
          fragment_id?: string | null
          user_id?: string | null
          flag_id?: string | null
          report_id?: string | null
          resolution_id?: string | null
          appeal_id?: string | null
          action_details: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          moderator_id?: string
          action_type?: string
          fragment_id?: string | null
          user_id?: string | null
          flag_id?: string | null
          report_id?: string | null
          resolution_id?: string | null
          appeal_id?: string | null
          action_details?: Json
          created_at?: string | null
        }
        Relationships: []
      }
      muted_conversations: {
        Row: {
          user_id: string
          conversation_id: string
          muted_until: string | null
          created_at: string | null
        }
        Insert: {
          user_id: string
          conversation_id: string
          muted_until?: string | null
          created_at?: string | null
        }
        Update: {
          user_id?: string
          conversation_id?: string
          muted_until?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      muted_users: {
        Row: {
          muter_id: string
          muted_id: string
          muted_until: string | null
          created_at: string | null
        }
        Insert: {
          muter_id: string
          muted_id: string
          muted_until?: string | null
          created_at?: string | null
        }
        Update: {
          muter_id?: string
          muted_id?: string
          muted_until?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          type: string
          fragment_id: string | null
          comment_id: string | null
          conversation_id: string | null
          read: boolean | null
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          actor_id?: string | null
          type: string
          fragment_id?: string | null
          comment_id?: string | null
          conversation_id?: string | null
          read?: boolean | null
          expires_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string | null
          type?: string
          fragment_id?: string | null
          comment_id?: string | null
          conversation_id?: string | null
          read?: boolean | null
          expires_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      posts_moderation: {
        Row: {
          id: string
          post_id: string
          reported_by: string | null
          assigned_to: string | null
          reason: string
          risk_level: string
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          post_id: string
          reported_by?: string | null
          assigned_to?: string | null
          reason: string
          risk_level?: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          reported_by?: string | null
          assigned_to?: string | null
          reason?: string
          risk_level?: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          photo_url: string
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          photo_url?: string
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          cover_url: string | null
          cover_position: Json | null
          bio: string | null
          date_of_birth: string | null
          is_moderator: boolean | null
          is_private: boolean | null
          account_status: string | null
          settings: Json | null
          paddle_customer_id: string | null
          created_at: string | null
          updated_at: string | null
          is_admin: boolean | null
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          cover_url?: string | null
          cover_position?: Json | null
          bio?: string | null
          date_of_birth?: string | null
          is_moderator?: boolean | null
          is_private?: boolean | null
          account_status?: string | null
          settings?: Json | null
          paddle_customer_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_admin?: boolean | null
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          cover_url?: string | null
          cover_position?: Json | null
          bio?: string | null
          date_of_birth?: string | null
          is_moderator?: boolean | null
          is_private?: boolean | null
          account_status?: string | null
          settings?: Json | null
          paddle_customer_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_admin?: boolean | null
        }
        Relationships: []
      }
      profiles_moderation: {
        Row: {
          id: string
          reported_user_id: string
          reported_by: string | null
          assigned_to: string | null
          reason: string
          risk_level: string
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          reported_user_id: string
          reported_by?: string | null
          assigned_to?: string | null
          reason: string
          risk_level?: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          reported_user_id?: string
          reported_by?: string | null
          assigned_to?: string | null
          reason?: string
          risk_level?: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      report_appeals: {
        Row: {
          id: string
          resolution_id: string
          appealed_by: string
          reason: string
          status: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          resolution_id: string
          appealed_by: string
          reason: string
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          resolution_id?: string
          appealed_by?: string
          reason?: string
          status?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      saved_fragments: {
        Row: {
          user_id: string
          fragment_id: string
          created_at: string | null
        }
        Insert: {
          user_id: string
          fragment_id: string
          created_at?: string | null
        }
        Update: {
          user_id?: string
          fragment_id?: string
          created_at?: string | null
        }
        Relationships: []
      }
      subscription_packages: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          price_aud_cents: number
          paddle_price_id: string | null
          max_photos: number | null
          features: Json | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          price_aud_cents?: number
          paddle_price_id?: string | null
          max_photos?: number | null
          features?: Json | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          price_aud_cents?: number
          paddle_price_id?: string | null
          max_photos?: number | null
          features?: Json | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          profile_id: string
          package_id: string
          paddle_subscription_id: string | null
          paddle_checkout_id: string | null
          status: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at: string | null
          cancelled_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          package_id: string
          paddle_subscription_id?: string | null
          paddle_checkout_id?: string | null
          status?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          package_id?: string
          paddle_subscription_id?: string | null
          paddle_checkout_id?: string | null
          status?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          tag: string
          usage_count: number | null
          created_at: string | null
          colour: string | null
        }
        Insert: {
          id?: string
          tag: string
          usage_count?: number | null
          created_at?: string | null
          colour?: string | null
        }
        Update: {
          id?: string
          tag?: string
          usage_count?: number | null
          created_at?: string | null
          colour?: string | null
        }
        Relationships: []
      }
      user_report_resolutions: {
        Row: {
          id: string
          reported_user_id: string
          status: string | null
          action_taken: string | null
          report_count: number | null
          priority: string | null
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          reported_user_id: string
          status?: string | null
          action_taken?: string | null
          report_count?: number | null
          priority?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          reported_user_id?: string
          status?: string | null
          action_taken?: string | null
          report_count?: number | null
          priority?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string
          reason: string
          details: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id: string
          reason: string
          details?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string
          reason?: string
          details?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      tag_count_discrepancies: {
        Row: {
          id: string | null
          tag: string | null
          stored_count: number | null
          actual_count: number | null
          difference: string | null
        }
        Insert: {
          [_ in never]: never
        }
        Update: {
          [_ in never]: never
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
