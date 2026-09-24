--! sql/06_auth_security_events.sql
/**
 * Auth Security Events Table
 * --------------------------
 * Immutable log of authentication events.
 *
 * Why this exists:
 * - audit trail
 * - intrusion detection
 * - debugging auth issues
 *
 * This table should NEVER be updated or deleted (append-only).
 */
CREATE TABLE
    IF NOT EXISTS "auth_security_events" (
        "id" UUID PRIMARY KEY,
        -- link to user when appliable
        "user_id" UUID NULL,
        -- Identifier used during the event
        "identifier" TEXT NULL,
        -- IP address of the request
        -- Supports IPv4 and IPv6
        "ip_address" INET NULL,
        -- Event type examples:
        --- signin_success
        --- signin_failed
        --- account_locked
        --- password_reset_requested
        --- password_reset_completed
        "event_type" TEXT NOT NULL,
        -- Raw user agent string
        "user_agent" TEXT NULL,
        -- Timestamp
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        CONSTRAINT "auth_security_events_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
    );

/**
 * Indexes
 * -------
 * - fast filtering by user
 * - fast filtering by identifier
 * - timeline queries
 */
CREATE INDEX IF NOT EXISTS "IDX_auth_security_events_user_id" ON "auth_security_events" ("user_id");

CREATE INDEX IF NOT EXISTS "IDX_auth_security_events_identifier" ON "auth_security_events" ("identifier");

CREATE INDEX IF NOT EXISTS "IDX_auth_security_events_created_at" ON "auth_security_events" ("created_at");
