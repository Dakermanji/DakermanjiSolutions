--! sql/02_users.sql
/**
 * Users Table
 * -----------
 * Core identity table for all users.
 *
 * Responsibilities:
 * - Store login credentials
 * - Store profile basics
 * - Track verification + blocking state
 *
 * Notes:
 * - Email is unique and required
 * - Username is optional but unique if present
 * - Blocking is handled inline for quick checks during auth
 */
DO $$
BEGIN
    CREATE TYPE "user_theme" AS ENUM ('system', 'light', 'dark');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE
    IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        -- Identity
        "email" TEXT NOT NULL,
        "username" TEXT NULL,
        "username_normalized" TEXT NULL,
        -- Authentication
        "hashed_password" TEXT NULL,
        -- Status flags
        "is_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        -- quick check during signin
        "is_blocked" BOOLEAN NOT NULL DEFAULT FALSE,
        -- human-readable reason for admin/debugging
        "blocked_reason" TEXT NULL,
        -- Localization
        "locale" VARCHAR(2) NOT NULL DEFAULT 'en',
        "country_code" CHAR(2) NULL,
        -- Preferences
        "theme" "user_theme" NOT NULL DEFAULT 'system',
        "avatar_seed" TEXT NULL,
        -- Legal acceptance
        "terms_accepted_at" TIMESTAMPTZ NULL,
        "terms_version" VARCHAR(10) NULL,
        "privacy_accepted_at" TIMESTAMPTZ NULL,
        "privacy_version" VARCHAR(10) NULL,
        -- Activity tracking
        "last_signin_at" TIMESTAMPTZ NULL,
        -- Timestamps
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        -- Constraints
        CONSTRAINT "users_email_unique" UNIQUE ("email"),
        CONSTRAINT "users_username_unique" UNIQUE ("username"),
        CONSTRAINT "users_country_code_format" CHECK (
            "country_code" IS NULL
            OR "country_code" ~ '^[A-Z]{2}$'
        )
    );

/**
 * Indexes
 * -------
 * Optimized for common queries:
 * - login (email)
 * - username lookup
 * - sorting by creation date
 */
CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");

CREATE INDEX IF NOT EXISTS "IDX_users_username_normalized" ON "users" ("username_normalized");

CREATE INDEX IF NOT EXISTS "IDX_users_created_at" ON "users" ("created_at");
