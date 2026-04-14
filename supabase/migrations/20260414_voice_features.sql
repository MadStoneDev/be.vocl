-- Voice-first features: voice comments + audio metadata

-- Allow voice comments alongside text
ALTER TABLE comments ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS audio_duration INT;
ALTER TABLE comments ALTER COLUMN content_html DROP NOT NULL;

-- Either text or audio (or both) must be present
ALTER TABLE comments ADD CONSTRAINT comments_text_or_audio
  CHECK (
    (content_html IS NOT NULL AND char_length(content_html) > 0)
    OR audio_url IS NOT NULL
  );
