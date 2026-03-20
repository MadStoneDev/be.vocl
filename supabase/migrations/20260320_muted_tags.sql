CREATE TABLE muted_tags (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, tag_id)
);
CREATE INDEX idx_muted_tags_user ON muted_tags(profile_id);
ALTER TABLE muted_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own muted tags" ON muted_tags FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can mute tags" ON muted_tags FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can unmute tags" ON muted_tags FOR DELETE USING (auth.uid() = profile_id);
