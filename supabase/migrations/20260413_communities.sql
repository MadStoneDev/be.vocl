-- Communities MVP
-- Public communities, open join policy, cross-post model.

CREATE TYPE community_visibility AS ENUM ('public', 'restricted', 'private');
CREATE TYPE community_join_policy AS ENUM ('open', 'request', 'invite_only');
CREATE TYPE community_member_role AS ENUM ('member', 'moderator', 'owner');

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  icon_url TEXT,
  visibility community_visibility NOT NULL DEFAULT 'public',
  join_policy community_join_policy NOT NULL DEFAULT 'open',
  nsfw BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_count INT NOT NULL DEFAULT 0,
  post_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT communities_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  CONSTRAINT communities_name_length CHECK (char_length(name) BETWEEN 2 AND 60)
);

CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_visibility ON communities(visibility);
CREATE INDEX idx_communities_created_at ON communities(created_at DESC);

CREATE TABLE community_members (
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role community_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_role ON community_members(community_id, role);

CREATE TABLE community_posts (
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT false,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (community_id, post_id)
);

CREATE INDEX idx_community_posts_community ON community_posts(community_id, added_at DESC);
CREATE INDEX idx_community_posts_post ON community_posts(post_id);
CREATE INDEX idx_community_posts_pinned ON community_posts(community_id, pinned) WHERE pinned = true;

-- Counters
CREATE OR REPLACE FUNCTION community_member_count_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER community_member_count
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW EXECUTE FUNCTION community_member_count_trigger();

CREATE OR REPLACE FUNCTION community_post_count_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER community_post_count
AFTER INSERT OR DELETE ON community_posts
FOR EACH ROW EXECUTE FUNCTION community_post_count_trigger();

-- Auto-add creator as owner on community creation
CREATE OR REPLACE FUNCTION community_add_owner_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER community_add_owner
AFTER INSERT ON communities
FOR EACH ROW EXECUTE FUNCTION community_add_owner_trigger();

-- RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- communities: public visibility readable by all; private/restricted visible only to members
CREATE POLICY "Public communities are viewable"
  ON communities FOR SELECT USING (
    visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = communities.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and moderators can update communities"
  ON communities FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = communities.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Owners can delete communities"
  ON communities FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = communities.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- community_members
CREATE POLICY "Members of public communities are visible to all"
  ON community_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_members.community_id
        AND (
          visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM community_members cm2
            WHERE cm2.community_id = community_members.community_id
              AND cm2.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Users can join open communities"
  ON community_members FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_id AND join_policy = 'open'
    )
  );

CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Owners and moderators can manage members"
  ON community_members FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members cm2
      WHERE cm2.community_id = community_members.community_id
        AND cm2.user_id = auth.uid()
        AND cm2.role IN ('owner', 'moderator')
    )
  );

-- community_posts
CREATE POLICY "Cross-posts visible per community visibility"
  ON community_posts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_posts.community_id
        AND (
          visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = community_posts.community_id
              AND user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Members can cross-post their own posts"
  ON community_posts FOR INSERT WITH CHECK (
    auth.uid() = added_by
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id AND author_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_posts.community_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authors and mods can remove cross-posts"
  ON community_posts FOR DELETE USING (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_posts.community_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'moderator')
    )
  );
