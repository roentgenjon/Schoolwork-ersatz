-- Migration: Datei-Upload via D1 + Chat-Bilder
-- Einmalig auf der Live-Datenbank ausführen:
--   wrangler d1 execute schoolwork-db --remote --file=src/db/migrate.sql

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  data TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

ALTER TABLE assignment_attachments ADD COLUMN r2_key TEXT;
ALTER TABLE submission_files ADD COLUMN r2_key TEXT;
ALTER TABLE chat_messages ADD COLUMN image_key TEXT;
