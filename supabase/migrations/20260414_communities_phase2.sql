-- Communities phase 2: join requests, rules, deferred cross-posts

CREATE TYPE community_join_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status community_join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id, status)
);

CREATE INDEX idx_community_join_requests_community ON community_join_requests(community_id, status);
CREATE INDEX idx_community_join_requests_user ON community_join_requests(user_id, status);

CREATE TABLE community_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_rules_title_length CHECK (char_length(title) BETWEEN 1 AND 120)
);

CREATE INDEX idx_community_rules_community ON community_rules(community_id, position);

-- Allow deferred cross-posts: communities to add to once a queued/scheduled post publishes.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pending_community_ids UUID[] DEFAULT NULL;

-- RLS
ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_rules ENABLE ROW LEVEL SECURITY;

-- Join requests
CREATE POLICY "Users see their own join requests"
  ON community_join_requests FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_join_requests.community_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Users can submit a join request"
  ON community_join_requests FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_id
        AND join_policy IN ('request', 'invite_only')
    )
  );

CREATE POLICY "Mods/owners can update requests"
  ON community_join_requests FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_join_requests.community_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Users can cancel their own pending requests"
  ON community_join_requests FOR DELETE USING (
    auth.uid() = user_id AND status = 'pending'
  );

-- Rules
CREATE POLICY "Rules visible per community visibility"
  ON community_rules FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_rules.community_id
        AND (
          visibility = 'public'
          OR EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = community_rules.community_id
              AND user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Mods/owners can manage rules"
  ON community_rules FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_rules.community_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'moderator')
    )
  );

-- Allow mods to insert cross-posts on behalf of others (e.g. when picking from author posts)
DROP POLICY IF EXISTS "Members can cross-post their own posts" ON community_posts;
CREATE POLICY "Members cross-post own; mods can add any"
  ON community_posts FOR INSERT WITH CHECK (
    auth.uid() = added_by
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_posts.community_id
        AND user_id = auth.uid()
    )
    AND (
      -- author posting their own
      EXISTS (
        SELECT 1 FROM posts
        WHERE id = post_id AND author_id = auth.uid()
      )
      OR
      -- mod/owner can pin any visible post
      EXISTS (
        SELECT 1 FROM community_members
        WHERE community_id = community_posts.community_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'moderator')
      )
    )
  );

-- Allow mods to update community_posts (e.g. pin)
CREATE POLICY "Mods/owners can update community_posts"
  ON community_posts FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_posts.community_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'moderator')
    )
  );

-- Auto-add membership when join request is approved
CREATE OR REPLACE FUNCTION community_join_request_apply_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO community_members (community_id, user_id, role)
    VALUES (NEW.community_id, NEW.user_id, 'member')
    ON CONFLICT (community_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER community_join_request_apply
AFTER UPDATE ON community_join_requests
FOR EACH ROW EXECUTE FUNCTION community_join_request_apply_trigger();
