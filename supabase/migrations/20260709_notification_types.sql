-- Expand notification_type so moderation, asks, appeals, tips and system
-- messages stop masquerading as 'mention' (or failing the enum check entirely,
-- e.g. tip notifications, which currently throw on insert).

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ask';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'moderation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'appeal';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'tip';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system';
