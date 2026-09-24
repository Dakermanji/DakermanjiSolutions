--! sql/05_auth_security.sql
/**
 * Auth Security Table
 * -------------------
 * Tracks authentication-related security state.
 *
 * Why this table exists:
 * - Avoid polluting users table with security logic
 * - Allow tracking before user exists (email-only attempts)
 * - Enable account lockouts and brute-force protection
 *
 * Design:
 * - user_id is nullable (for pre-user login attempts)
 * - identifier can be email or username
 */
CREATE TABLE
    IF NOT EXISTS "auth_security" (
        "id" UUID PRIMARY KEY,
        -- Link to user (nullable for unknown users)
        "user_id" UUID NULL,
        -- Identifier used during auth attempts: email / username
        "identifier" TEXT NULL,
        -- Activity tracking
        "last_signin_at" TIMESTAMPTZ NULL,
        "last_failed_signin_at" TIMESTAMPTZ NULL,
        -- Failed attempts counter, for:
        --- brute force detection
        --- temporary lockouts
        "failed_signin_count" INTEGER NOT NULL DEFAULT 0,
        -- Lock system
        "locked_until" TIMESTAMPTZ NULL,
        -- Force user to reset password
        "force_password_reset" BOOLEAN NOT NULL DEFAULT FALSE,
        -- Timestamps
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        -- Foreign Key
        CONSTRAINT "auth_security_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
    );

/**
 * Indexes
 * -------
 * - identifier lookup (login attempts)
 * - user_id lookup (linked users)
 */
CREATE INDEX IF NOT EXISTS "IDX_auth_security_user_id" ON "auth_security" ("user_id");

CREATE INDEX IF NOT EXISTS "IDX_auth_security_identifier" ON "auth_security" ("identifier");
