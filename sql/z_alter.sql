--! sql/z_alter.sql
-- Only manual preferences are persisted; Offline and automatic Away are derived.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS presence_status TEXT NOT NULL DEFAULT 'online'
    CONSTRAINT users_presence_status_check CHECK (presence_status IN ('online', 'away', 'busy'));
