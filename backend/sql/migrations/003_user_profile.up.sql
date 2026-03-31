-- Migration 003: User profile fields and approval status

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'active', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS status     user_status  NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name       VARCHAR(180);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address    TEXT;

-- Existing users remain active
UPDATE users SET status = 'active' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
