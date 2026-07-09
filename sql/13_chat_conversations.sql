--! sql/13_chat_conversations.sql
/**
 * Chat Conversations Table
 * ------------------------
 * Stores the shared conversation shell for direct chats, self notes,
 * private rooms, and public rooms.
 *
 * Why this table exists:
 * - keep all chat types on one conversation engine
 * - provide stable conversation ids for routes, sockets, and chat lists
 * - support room titles and last-message feed ordering
 *
 * Notes:
 * - friend chat access should be enforced by application logic using follows/blocks
 * - self notes use chat_conversations.type = 'self'
 * - last_message_id is constrained after chat_messages exists
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_conversation_type'
	) THEN
		CREATE TYPE chat_conversation_type AS ENUM (
			'friend',
			'self',
			'private_room',
			'public_room'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "chat_conversations" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- conversation shape
	"type" chat_conversation_type NOT NULL,
	"title" VARCHAR(120) NULL,

	-- creator identity
	"created_by_user_id" UUID NOT NULL,

	-- denormalized feed pointer
	"last_message_id" UUID NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"archived_at" TIMESTAMPTZ NULL,

	-- foreign keys
	CONSTRAINT "chat_conversations_created_by_user_fk"
		FOREIGN KEY ("created_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	-- room titles are only useful for room conversations
	CONSTRAINT "chat_conversations_title_check"
		CHECK (
			("type" IN ('private_room', 'public_room') AND "title" IS NOT NULL)
			OR ("type" IN ('friend', 'self') AND "title" IS NULL)
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - filtering by conversation type
 * - listing rooms by creator
 * - sorting chat lists by latest activity
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_type"
	ON "chat_conversations" ("type");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_created_by_user_id"
	ON "chat_conversations" ("created_by_user_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_updated_at"
	ON "chat_conversations" ("updated_at");

CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_last_message_id"
	ON "chat_conversations" ("last_message_id");
