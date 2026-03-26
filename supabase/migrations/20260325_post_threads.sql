-- Post threads (compose series): allow posts to be linked in ordered threads
ALTER TABLE posts ADD COLUMN thread_id UUID REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN thread_position INTEGER;
CREATE INDEX idx_posts_thread ON posts(thread_id, thread_position);
