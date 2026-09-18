-- ! sql/01_session.sql
-- Session table for express-session + connect-pg-simple
--
-- Why this file exists:
-- - Stores user sessions in PostgreSQL instead of memory
-- - Persists signin state across server restarts
-- - Supports production-ready session management
--
-- Notes:
-- - Table name must match connect-pg-simple default: "session"
-- - "expire" is used to determine when a session becomes invalid
-- - Index on "expire" helps cleanup and expiration queries
CREATE TABLE
    IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    );

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
