-- ! sql/04_auth_tokens.sql
-- Authentication tokens table
--
-- Responsibilities:
-- - Store hashed tokens for authentication-related flows
-- - Support features such as email verification and password reset
-- - Allow multiple tokens per user over time
--
-- Notes:
-- - Only hashed tokens are stored for security
-- - A token can be marked as used without deleting its history
-- - Expired or used tokens should be ignored by application logic
-- - Token types are limited through a PostgreSQL ENUM

-- Create enum type for auth token types
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_token_type') THEN
		CREATE TYPE auth_token_type AS ENUM (
			'signup_verification',
			'password_reset',
			'account_deletion'
		);
	END IF;
END$$;

ALTER TYPE auth_token_type ADD VALUE IF NOT EXISTS 'account_deletion';

CREATE TABLE IF NOT EXISTS "auth_tokens" (
	"id" UUID PRIMARY KEY,
	"user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
	"token_hash" TEXT NOT NULL,
	"type" auth_token_type NOT NULL,

	"expires_at" TIMESTAMPTZ NOT NULL,
	"used_at" TIMESTAMPTZ NULL,
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	CONSTRAINT "auth_tokens_token_hash_unique" UNIQUE ("token_hash")
);

CREATE INDEX IF NOT EXISTS "IDX_auth_tokens_user_id"
	ON "auth_tokens" ("user_id");

CREATE INDEX IF NOT EXISTS "IDX_auth_tokens_type"
	ON "auth_tokens" ("type");

CREATE INDEX IF NOT EXISTS "IDX_auth_tokens_expires_at"
	ON "auth_tokens" ("expires_at");

CREATE INDEX IF NOT EXISTS "IDX_auth_tokens_user_id_type"
	ON "auth_tokens" ("user_id", "type");
