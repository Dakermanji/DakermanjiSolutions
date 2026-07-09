--! sql/15_chat_messages.sql
/**
 * Chat Messages Table
 * -------------------
 * Stores messages for all chat conversation types.
 *
 * Why this table exists:
 * - keep friend chats, self notes, private rooms, and public rooms
 *   on one message history model
 * - support edited/deleted message lifecycle
 * - provide the target for unread and last-message pointers
 *
 * Notes:
 * - sender membership should be enforced by application logic
 * - deleted messages stay as rows so history/read pointers remain stable
 */

CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- message identity
	"conversation_id" UUID NOT NULL,
	"sender_user_id" UUID NOT NULL,
	"body" TEXT NOT NULL,

	-- message lifecycle
	"edited_at" TIMESTAMPTZ NULL,
	"deleted_at" TIMESTAMPTZ NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_messages_conversation_fk"
		FOREIGN KEY ("conversation_id")
		REFERENCES "chat_conversations" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_messages_sender_user_fk"
		FOREIGN KEY ("sender_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	-- prevent empty messages
	CONSTRAINT "chat_messages_body_check"
		CHECK (LENGTH(BTRIM("body")) > 0)
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chat_conversations_last_message_fk'
	) THEN
		ALTER TABLE "chat_conversations"
			ADD CONSTRAINT "chat_conversations_last_message_fk"
			FOREIGN KEY ("last_message_id")
			REFERENCES "chat_messages" ("id")
			ON DELETE SET NULL;
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chat_conversation_members_last_read_message_fk'
	) THEN
		ALTER TABLE "chat_conversation_members"
			ADD CONSTRAINT "chat_conversation_members_last_read_message_fk"
			FOREIGN KEY ("last_read_message_id")
			REFERENCES "chat_messages" ("id")
			ON DELETE SET NULL;
	END IF;
END$$;

/**
 * Indexes
 * -------
 * Optimized for:
 * - message history by conversation
 * - message ownership checks
 * - pruning or auditing by creation time
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_messages_conversation_created_at"
	ON "chat_messages" ("conversation_id", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_sender_user_id"
	ON "chat_messages" ("sender_user_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_created_at"
	ON "chat_messages" ("created_at");
