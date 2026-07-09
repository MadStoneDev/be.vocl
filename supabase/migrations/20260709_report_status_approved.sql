-- Add a "resolved_approved" outcome to report_status.
--
-- Moderation now needs an explicit "approve & publish" resolution for held
-- content (auto-moderation holds land in the reports queue). Without this value
-- the enum column rejects both the write and a status filter on it.

ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'resolved_approved';
