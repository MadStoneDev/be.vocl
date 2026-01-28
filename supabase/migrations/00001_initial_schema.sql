-- be.vocl Initial Schema Migration
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'audio', 'gallery');
CREATE TYPE post_status AS ENUM ('draft', 'published', 'queued', 'scheduled', 'deleted');
CREATE TYPE notification_type AS ENUM ('follow', 'like', 'comment', 'reblog', 'message', 'mention');

-- ============================================================================
-- USERS & PROFILES
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  header_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Privacy settings
  show_likes BOOLEAN DEFAULT true,
  show_comments BOOLEAN DEFAULT true,
  show_followers BOOLEAN DEFAULT true,
  show_following BOOLEAN DEFAULT true,

  -- NSFW settings
  show_sensitive_posts BOOLEAN DEFAULT false,
  blur_sensitive_by_default BOOLEAN DEFAULT true,

  -- Queue settings
  queue_enabled BOOLEAN DEFAULT true,
  queue_paused BOOLEAN DEFAULT false,
  queue_posts_per_day INTEGER DEFAULT 8,
  queue_window_start TIME DEFAULT '09:00:00',
  queue_window_end TIME DEFAULT '21:00:00'
);

-- User links (link-in-bio style)
CREATE TABLE profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FOLLOWS & RELATIONSHIPS
-- ============================================================================

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ============================================================================
-- POSTS
-- ============================================================================

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_type post_type NOT NULL,
  status post_status DEFAULT 'published',

  -- Content stored as JSONB for flexibility
  content JSONB NOT NULL,

  -- NSFW flag
  is_sensitive BOOLEAN DEFAULT false,

  -- Reblog chain
  original_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  reblogged_from_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  reblog_comment_html TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  queue_position INTEGER,

  -- Pinned post (per user)
  is_pinned BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- ============================================================================
-- TAGS
-- ============================================================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE followed_tags (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, tag_id)
);

-- ============================================================================
-- INTERACTIONS
-- ============================================================================

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CHAT / MESSAGING
-- ============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT, -- 'image', 'video', 'audio'
  is_deleted BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Typing indicators (ephemeral, managed via Supabase Realtime)
CREATE TABLE typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, profile_id)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notification_type notification_type NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BLOCKS & MUTES
-- ============================================================================

CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE mutes (
  muter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Posts
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_posts_queued ON posts(author_id, queue_position) WHERE status = 'queued';
CREATE INDEX idx_posts_scheduled ON posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_posts_original ON posts(original_post_id) WHERE original_post_id IS NOT NULL;

-- Feed query optimization
CREATE INDEX idx_feed_query ON posts(author_id, status, published_at DESC);

-- Follows
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Likes & Comments
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_comments_post ON comments(post_id);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversation_participants ON conversation_participants(profile_id);

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);

-- Tags
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);
CREATE INDEX idx_followed_tags_user ON followed_tags(profile_id);

-- Full-text search on posts (optional - requires content->>'plain' for text posts)
-- CREATE INDEX idx_posts_content_search ON posts USING GIN (to_tsvector('english', content->>'plain'));

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'display_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update tag counts
CREATE OR REPLACE FUNCTION update_tag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET post_count = post_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET post_count = post_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_tags_count AFTER INSERT OR DELETE ON post_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_count();

-- Queue position management function
CREATE OR REPLACE FUNCTION get_next_queue_position(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  max_pos INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) INTO max_pos
  FROM posts
  WHERE author_id = p_user_id AND status = 'queued';
  RETURN max_pos + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE followed_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Profile Links
CREATE POLICY "Profile links are viewable by everyone"
  ON profile_links FOR SELECT USING (true);
CREATE POLICY "Users can manage own profile links"
  ON profile_links FOR ALL USING (auth.uid() = profile_id);

-- Follows
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Posts
CREATE POLICY "Published posts are viewable (with block check)"
  ON posts FOR SELECT USING (
    (status = 'published' OR author_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = auth.uid() AND blocked_id = posts.author_id
    )
  );
CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE USING (author_id = auth.uid());

-- Tags
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Post Tags
CREATE POLICY "Post tags are viewable by everyone"
  ON post_tags FOR SELECT USING (true);
CREATE POLICY "Post authors can manage post tags"
  ON post_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM posts WHERE id = post_id AND author_id = auth.uid())
  );

-- Followed Tags
CREATE POLICY "Users can view own followed tags"
  ON followed_tags FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can manage own followed tags"
  ON followed_tags FOR ALL USING (profile_id = auth.uid());

-- Likes
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts"
  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts"
  ON likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

-- Conversations
CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND profile_id = auth.uid()
    )
  );
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Conversation Participants
CREATE POLICY "Participants can view conversation participants"
  ON conversation_participants FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id = auth.uid()
    )
  );
CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update own participation"
  ON conversation_participants FOR UPDATE USING (profile_id = auth.uid());

-- Messages
CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );
CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE USING (sender_id = auth.uid());

-- Typing Indicators
CREATE POLICY "Participants can view typing indicators"
  ON typing_indicators FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = typing_indicators.conversation_id
      AND profile_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage own typing indicator"
  ON typing_indicators FOR ALL USING (profile_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (recipient_id = auth.uid());
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Blocks
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT USING (blocker_id = auth.uid());
CREATE POLICY "Users can manage own blocks"
  ON blocks FOR ALL USING (blocker_id = auth.uid());

-- Mutes
CREATE POLICY "Users can view own mutes"
  ON mutes FOR SELECT USING (muter_id = auth.uid());
CREATE POLICY "Users can manage own mutes"
  ON mutes FOR ALL USING (muter_id = auth.uid());

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Enable realtime for messages and typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
