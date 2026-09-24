--! sql/10_user_blocks.sql
/**
 * User Blocks Table
 * -----------------
 * Stores active block relationships between users.
 *
 * Why this table exists:
 * - prevent unwanted interaction between users
 * - override follow requests and follow relationships
 * - support blocked users listing efficiently
 *
 * Notes:
 * - one user cannot block themselves
 * - only one active block is allowed per blocker -> blocked pair
 * - block effects on follow requests / follows should be enforced by application logic
 */
CREATE TABLE
    IF NOT EXISTS "user_blocks" (
        "id" UUID PRIMARY KEY,
        -- user who performs the block
        "blocker_id" UUID NOT NULL,
        -- user being blocked
        "blocked_id" UUID NOT NULL,
        -- timestamp
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        -- foreign keys
        CONSTRAINT "user_blocks_blocker_fk" FOREIGN KEY ("blocker_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "user_blocks_blocked_fk" FOREIGN KEY ("blocked_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        -- prevent self-block
        CONSTRAINT "user_blocks_blocker_blocked_check" CHECK ("blocker_id" <> "blocked_id"),
        -- prevent duplicate active blocks
        CONSTRAINT "UQ_user_blocks_blocker_blocked" UNIQUE ("blocker_id", "blocked_id")
    );

/**
 * Indexes
 * -------
 * Optimized for:
 * - blocked users lookup by blocker
 * - checking whether a user is blocked by another user
 * - sorting by recency
 */
CREATE INDEX IF NOT EXISTS "IDX_user_blocks_blocker_id" ON "user_blocks" ("blocker_id");

CREATE INDEX IF NOT EXISTS "IDX_user_blocks_blocked_id" ON "user_blocks" ("blocked_id");

CREATE INDEX IF NOT EXISTS "IDX_user_blocks_created_at" ON "user_blocks" ("created_at");

CREATE INDEX IF NOT EXISTS "IDX_user_blocks_blocker_id_created_at" ON "user_blocks" ("blocker_id", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_user_blocks_blocked_id_created_at" ON "user_blocks" ("blocked_id", "created_at");
