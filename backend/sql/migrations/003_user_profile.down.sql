-- Migration 003 DOWN: Remove user profile fields and status

DROP INDEX IF EXISTS idx_users_status;

ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS name;
ALTER TABLE users DROP COLUMN IF EXISTS status;

DROP TYPE IF EXISTS user_status;
