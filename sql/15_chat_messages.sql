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

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_message_moderation_status'
	) THEN
		CREATE TYPE chat_message_moderation_status AS ENUM (
			'visible',
			'pending_review',
			'hidden'
		);
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_message_moderation_reason'
	) THEN
		CREATE TYPE chat_message_moderation_reason AS ENUM (
			'profanity',
			'abuse',
			'flagged',
			'admin_deleted'
		);
	END IF;
END$$;
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- message identity
	"conversation_id" UUID NOT NULL,
	"sender_user_id" UUID NOT NULL,
	"reply_to_message_id" UUID NULL,
	"body" TEXT NOT NULL,

	-- message lifecycle
	"edited_at" TIMESTAMPTZ NULL,
	"deleted_at" TIMESTAMPTZ NULL,
	"moderation_status" chat_message_moderation_status NOT NULL DEFAULT 'visible',
	"moderation_reason" chat_message_moderation_reason NULL,
	"reviewed_by_user_id" UUID NULL,
	"reviewed_at" TIMESTAMPTZ NULL,

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

	CONSTRAINT "chat_messages_reply_to_message_fk"
		FOREIGN KEY ("reply_to_message_id")
		REFERENCES "chat_messages" ("id")
		ON DELETE SET NULL,

	CONSTRAINT "chat_messages_reviewed_by_user_fk"
		FOREIGN KEY ("reviewed_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE SET NULL,

	-- prevent empty messages
	CONSTRAINT "chat_messages_body_check"
		CHECK (LENGTH(BTRIM("body")) > 0),

	-- pending/hidden messages need a reason for review context
	CONSTRAINT "chat_messages_moderation_reason_check"
		CHECK (
			"moderation_status" = 'visible'
			OR "moderation_reason" IS NOT NULL
		),

	-- pending messages have not been reviewed yet
	CONSTRAINT "chat_messages_pending_review_check"
		CHECK (
			"moderation_status" <> 'pending_review'
			OR (
				"reviewed_by_user_id" IS NULL
				AND "reviewed_at" IS NULL
			)
		),

	-- review metadata is stored together
	CONSTRAINT "chat_messages_review_pair_check"
		CHECK (
			("reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL)
			OR ("reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
		)
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

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_reply_to_message_id"
	ON "chat_messages" ("reply_to_message_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_conversation_moderation_created_at"
	ON "chat_messages" ("conversation_id", "moderation_status", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_moderation_status_created_at"
	ON "chat_messages" ("moderation_status", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_reviewed_by_user_id"
	ON "chat_messages" ("reviewed_by_user_id")
	WHERE "reviewed_by_user_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_chat_messages_created_at"
	ON "chat_messages" ("created_at");
