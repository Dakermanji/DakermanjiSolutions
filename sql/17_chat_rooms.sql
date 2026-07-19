--! sql/17_chat_rooms.sql
/**
 * Chat Rooms Table
 * ----------------
 * Stores room-specific metadata for public, private, and project rooms.
 *
 * Why this table exists:
 * - keep room discovery/access settings separate from the shared conversation shell
 * - support listed and unlisted private rooms without changing message storage
 * - preserve one room metadata row per room conversation
 *
 * Notes:
 * - chat_conversations.title stores the room display name
 * - chat_conversations.created_by_user_id stores the room owner identity
 * - chat_conversation_members stores room owners, admins, and members
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_room_visibility'
	) THEN
		CREATE TYPE chat_room_visibility AS ENUM (
			'public',
			'private_listed',
			'private_unlisted'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_room_join_policy'
	) THEN
		CREATE TYPE chat_room_join_policy AS ENUM (
			'open',
			'request',
			'invite_only'
		);
	END IF;
END$$;

ALTER TYPE chat_conversation_type ADD VALUE IF NOT EXISTS 'project_room';

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chat_conversations_title_check'
	) THEN
		ALTER TABLE "chat_conversations"
			DROP CONSTRAINT "chat_conversations_title_check";
	END IF;

	ALTER TABLE "chat_conversations"
		ADD CONSTRAINT "chat_conversations_title_check"
		CHECK (
			("type" IN ('private_room', 'public_room', 'project_room') AND "title" IS NOT NULL)
			OR ("type" IN ('friend', 'self') AND "title" IS NULL)
		);
END$$;

CREATE TABLE IF NOT EXISTS "chat_rooms" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- room identity
	"conversation_id" UUID NOT NULL,

	-- room discovery / access
	"description" VARCHAR(500) NULL,
	"keywords" TEXT[] NOT NULL,
	"visibility" chat_room_visibility NOT NULL,
	"join_policy" chat_room_join_policy NOT NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"archived_at" TIMESTAMPTZ NULL,

	-- foreign keys
	CONSTRAINT "chat_rooms_conversation_fk"
		FOREIGN KEY ("conversation_id")
		REFERENCES "chat_conversations" ("id")
		ON DELETE CASCADE,

	-- one metadata row per room conversation
	CONSTRAINT "UQ_chat_rooms_conversation"
		UNIQUE ("conversation_id"),

	-- listed private rooms can support join requests; unlisted rooms stay invite-only
	CONSTRAINT "chat_rooms_visibility_join_policy_check"
		CHECK (
			("visibility" = 'public' AND "join_policy" IN ('open', 'request'))
			OR ("visibility" = 'private_listed' AND "join_policy" = 'request')
			OR ("visibility" = 'private_unlisted' AND "join_policy" = 'invite_only')
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - room metadata lookup by conversation
 * - public/listed room discovery
 * - filtering room join policy during access checks
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_rooms_conversation_id"
	ON "chat_rooms" ("conversation_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_rooms_visibility"
	ON "chat_rooms" ("visibility");

CREATE INDEX IF NOT EXISTS "IDX_chat_rooms_join_policy"
	ON "chat_rooms" ("join_policy");

CREATE INDEX IF NOT EXISTS "IDX_chat_rooms_visibility_archived_at"
	ON "chat_rooms" ("visibility", "archived_at");
