-- Launch hardening: close two RLS gaps.
--
-- bookmark_collections and muted_post_notifications (created in
-- 20260314_phase1_phase2_features.sql) were never given RLS, so under Supabase's
-- default grants any authenticated user — and the anon key — could read and
-- write every user's rows. Enable RLS and scope both tables to their owner.

ALTER TABLE bookmark_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_post_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bookmark collections" ON bookmark_collections;
CREATE POLICY "Users manage own bookmark collections"
  ON bookmark_collections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own muted post notifications" ON muted_post_notifications;
CREATE POLICY "Users manage own muted post notifications"
  ON muted_post_notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
