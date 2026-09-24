--! sql/07_signup_security.sql
/**
 * Signup Security Table
 * ---------------------
 * Tracks signup attempts to prevent abuse such as:
 * - mass signup requests
 * - sending signup emails to many different addresses
 *
 * Design:
 * - focuses on IP + email combination
 * - tracks attempt count and cooldown/lock state
 *
 * Notes:
 * - email is nullable (for IP-only tracking if needed)
 * - no step tracking (only signup start is relevant)
 */
CREATE TABLE
    IF NOT EXISTS "signup_security" (
        "id" UUID PRIMARY KEY,
        /**
         * Source IP address (IPv4 / IPv6)
         */
        "ip_address" INET NOT NULL,
        /**
         * Target email (nullable for IP-only tracking)
         */
        "email" TEXT NULL,
        /**
         * Number of attempts for this (ip, email)
         */
        "attempt_count" INTEGER NOT NULL DEFAULT 0,
        /**
         * Last attempt timestamp
         */
        "last_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        /**
         * Lock until timestamp
         * - if NOW() < locked_until → deny action
         */
        "locked_until" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

/**
 * Indexes
 * -------
 * Optimized for:
 * - IP-based abuse detection
 * - email cooldown checks
 */
CREATE INDEX IF NOT EXISTS "IDX_signup_security_ip_address" ON "signup_security" ("ip_address");

CREATE INDEX IF NOT EXISTS "IDX_signup_security_email" ON "signup_security" ("email");

CREATE INDEX IF NOT EXISTS "IDX_signup_security_last_attempt_at" ON "signup_security" ("last_attempt_at");

/**
 * Unique constraint
 * -----------------
 * Ensures one row per (ip, email)
 *
 * Notes:
 * - email can be NULL → PostgreSQL allows multiple NULLs
 * - acceptable for now
 */
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_signup_security_ip_email" ON "signup_security" ("ip_address", "email");
