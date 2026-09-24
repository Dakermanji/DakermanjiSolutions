--! sql/09_user_follows.sql
/**
 * User Follows Table
 * ------------------
 * Stores accepted follow relationships between users.
 *
 * Why this table exists:
 * - represent active follow relationships
 * - separate accepted follows from follow request history
 * - support followers / following queries efficiently
 *
 * Notes:
 * - one user cannot follow themselves
 * - only one active follow relationship is allowed per follower -> followee pair
 * - rows should usually be created only after a follow request is accepted
 * - block rules should be enforced by application logic
 */
CREATE TABLE
    IF NOT EXISTS "user_follows" (
        "id" UUID PRIMARY KEY,
        -- user who follows
        "follower_id" UUID NOT NULL,
        -- user being followed
        "followee_id" UUID NOT NULL,
        -- timestamp
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        -- foreign keys
        CONSTRAINT "user_follows_follower_fk" FOREIGN KEY ("follower_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "user_follows_followee_fk" FOREIGN KEY ("followee_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        -- prevent self-follow
        CONSTRAINT "user_follows_follower_followee_check" CHECK ("follower_id" <> "followee_id"),
        -- prevent duplicate follows
        CONSTRAINT "UQ_user_follows_follower_followee" UNIQUE ("follower_id", "followee_id")
    );

/**
 * Indexes
 * -------
 * Optimized for:
 * - followers lookup by followee
 * - following lookup by follower
 * - sorting by recency
 */
CREATE INDEX IF NOT EXISTS "IDX_user_follows_follower_id" ON "user_follows" ("follower_id");

CREATE INDEX IF NOT EXISTS "IDX_user_follows_followee_id" ON "user_follows" ("followee_id");

CREATE INDEX IF NOT EXISTS "IDX_user_follows_created_at" ON "user_follows" ("created_at");

CREATE INDEX IF NOT EXISTS "IDX_user_follows_followee_id_created_at" ON "user_follows" ("followee_id", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_user_follows_follower_id_created_at" ON "user_follows" ("follower_id", "created_at");
