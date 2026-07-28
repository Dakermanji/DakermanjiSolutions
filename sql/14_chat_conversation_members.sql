--! sql/14_chat_conversation_members.sql
/**
 * Chat Conversation Members Table
 * -------------------------------
 * Stores user membership, role, read state, and personal chat preferences.
 *
 * Why this table exists:
 * - answer who belongs to a conversation
 * - support room owners/admins/members
 * - track unread state per user
 * - let users mute or archive conversations independently
 *
 * Notes:
 * - public room discovery can still be open while membership tracks joined users
 * - last_read_message_id is constrained after chat_messages exists
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_member_role'
	) THEN
		CREATE TYPE chat_member_role AS ENUM (
			'owner',
			'admin',
			'member'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_member_status'
	) THEN
		CREATE TYPE chat_member_status AS ENUM (
			'active',
			'muted',
			'banned',
			'removed'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "chat_conversation_members" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- membership identity
	"conversation_id" UUID NOT NULL,
	"user_id" UUID NOT NULL,
	"role" chat_member_role NOT NULL DEFAULT 'member',
	"status" chat_member_status NOT NULL DEFAULT 'active',

	-- read / preference state
	"last_read_message_id" UUID NULL,
	"muted_until" TIMESTAMPTZ NULL,
	"archived_at" TIMESTAMPTZ NULL,

	-- timestamps
	"joined_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_conversation_members_conversation_fk"
		FOREIGN KEY ("conversation_id")
		REFERENCES "chat_conversations" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_conversation_members_user_fk"
		FOREIGN KEY ("user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	-- prevent duplicate membership
	CONSTRAINT "UQ_chat_conversation_members_conversation_user"
		UNIQUE ("conversation_id", "user_id")
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - chat lists by user
 * - member lists by conversation
 * - archived conversation filtering
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_members_user_id"
	ON "chat_conversation_members" ("user_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_members_conversation_id"
	ON "chat_conversation_members" ("conversation_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_members_user_archived_at"
	ON "chat_conversation_members" ("user_id", "archived_at");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_members_user_status"
	ON "chat_conversation_members" ("user_id", "status");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_members_conversation_status"
	ON "chat_conversation_members" ("conversation_id", "status");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_members_last_read_message_id"
	ON "chat_conversation_members" ("last_read_message_id");
