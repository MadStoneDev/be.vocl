-- Add 'escalated' status to report_status enum
-- This must be in a separate transaction before it can be used
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'escalated' AFTER 'reviewing';
