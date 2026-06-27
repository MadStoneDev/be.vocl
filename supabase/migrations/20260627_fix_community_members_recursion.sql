-- Fix: "infinite recursion detected in policy for relation community_members"
--
-- Root cause: the SELECT policy "Members of public communities are visible to all"
-- on community_members contains an inline subquery against community_members itself
-- (alias cm2) to check "am I a member of this community". Because that subquery is
-- evaluated under RLS, it re-triggers the very same SELECT policy, which subqueries
-- community_members again -> infinite recursion.
--
-- The UPDATE policy "Owners and moderators can manage members" has the same shape
-- (self-referential subquery on community_members) and is fixed the same way.
--
-- Standard fix: introduce SECURITY DEFINER helper functions that read
-- community_members WITHOUT triggering RLS, then rewrite every policy that needs to
-- check membership / role to call those helpers instead of an inline subquery.
-- The intended access semantics are preserved exactly.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER bypasses RLS on community_members)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_community_member(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_community_moderator(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND role IN ('owner', 'moderator')
  );
$$;

CREATE OR REPLACE FUNCTION is_community_owner(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION is_community_member(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_community_moderator(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_community_owner(UUID, UUID) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- community_members policies (the direct source of the recursion)
-- ---------------------------------------------------------------------------

-- SELECT: members of a community visible if community is public, or the viewer
-- is a member of that community. The membership check now goes through the
-- SECURITY DEFINER helper instead of a self-referential subquery.
DROP POLICY IF EXISTS "Members of public communities are visible to all" ON community_members;
CREATE POLICY "Members of public communities are visible to all"
  ON community_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_members.community_id
        AND (
          visibility = 'public'
          OR is_community_member(community_members.community_id, auth.uid())
        )
    )
  );

-- UPDATE: owners/moderators can manage members. Was self-referential on
-- community_members (alias cm2); now uses the helper.
DROP POLICY IF EXISTS "Owners and moderators can manage members" ON community_members;
CREATE POLICY "Owners and moderators can manage members"
  ON community_members FOR UPDATE USING (
    is_community_moderator(community_members.community_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- communities policies (subquery community_members; route through helpers so
-- they never re-enter the community_members SELECT policy)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public communities are viewable" ON communities;
CREATE POLICY "Public communities are viewable"
  ON communities FOR SELECT USING (
    visibility = 'public'
    OR is_community_member(communities.id, auth.uid())
  );

DROP POLICY IF EXISTS "Owners and moderators can update communities" ON communities;
CREATE POLICY "Owners and moderators can update communities"
  ON communities FOR UPDATE USING (
    is_community_moderator(communities.id, auth.uid())
  );

DROP POLICY IF EXISTS "Owners can delete communities" ON communities;
CREATE POLICY "Owners can delete communities"
  ON communities FOR DELETE USING (
    is_community_owner(communities.id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- community_posts policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Cross-posts visible per community visibility" ON community_posts;
CREATE POLICY "Cross-posts visible per community visibility"
  ON community_posts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_posts.community_id
        AND (
          visibility = 'public'
          OR is_community_member(community_posts.community_id, auth.uid())
        )
    )
  );

-- INSERT policy was last (re)defined in 20260414_communities_phase2.sql as
-- "Members cross-post own; mods can add any".
DROP POLICY IF EXISTS "Members cross-post own; mods can add any" ON community_posts;
CREATE POLICY "Members cross-post own; mods can add any"
  ON community_posts FOR INSERT WITH CHECK (
    auth.uid() = added_by
    AND is_community_member(community_posts.community_id, auth.uid())
    AND (
      -- author posting their own
      EXISTS (
        SELECT 1 FROM posts
        WHERE id = post_id AND author_id = auth.uid()
      )
      -- mod/owner can pin any visible post
      OR is_community_moderator(community_posts.community_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors and mods can remove cross-posts" ON community_posts;
CREATE POLICY "Authors and mods can remove cross-posts"
  ON community_posts FOR DELETE USING (
    auth.uid() = added_by
    OR is_community_moderator(community_posts.community_id, auth.uid())
  );

DROP POLICY IF EXISTS "Mods/owners can update community_posts" ON community_posts;
CREATE POLICY "Mods/owners can update community_posts"
  ON community_posts FOR UPDATE USING (
    is_community_moderator(community_posts.community_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- community_join_requests policies (subquery community_members)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users see their own join requests" ON community_join_requests;
CREATE POLICY "Users see their own join requests"
  ON community_join_requests FOR SELECT USING (
    auth.uid() = user_id
    OR is_community_moderator(community_join_requests.community_id, auth.uid())
  );

DROP POLICY IF EXISTS "Mods/owners can update requests" ON community_join_requests;
CREATE POLICY "Mods/owners can update requests"
  ON community_join_requests FOR UPDATE USING (
    is_community_moderator(community_join_requests.community_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- community_rules policies (subquery community_members)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Rules visible per community visibility" ON community_rules;
CREATE POLICY "Rules visible per community visibility"
  ON community_rules FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_rules.community_id
        AND (
          visibility = 'public'
          OR is_community_member(community_rules.community_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Mods/owners can manage rules" ON community_rules;
CREATE POLICY "Mods/owners can manage rules"
  ON community_rules FOR ALL USING (
    is_community_moderator(community_rules.community_id, auth.uid())
  );
