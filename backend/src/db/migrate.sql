-- Migration: R2 file storage + chat images
-- Run these on the live D1 database:
--   wrangler d1 execute schoolwork-db --remote --file=src/db/migrate.sql

ALTER TABLE assignment_attachments ADD COLUMN r2_key TEXT;
ALTER TABLE submission_files ADD COLUMN r2_key TEXT;
ALTER TABLE chat_messages ADD COLUMN image_key TEXT;
