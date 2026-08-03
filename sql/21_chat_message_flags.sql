--! sql/21_chat_message_flags.sql
/**
 * Chat Message Flags Table
 * ------------------------
 * Stores member reports for chat messages that need room owner/admin review.
 *
 * Why this table exists:
 * - let room members flag messages without deleting or editing message history
 * - prevent duplicate flags from the same user on the same message
 * - keep enough review metadata for owner/admin moderation later
 *
 * Notes:
 * - application logic controls who can flag and who can review
 * - safe flagged messages remain visible after a room owner/admin evaluates them
 * - deleted flagged messages are hidden by the chat_messages deleted_at lifecycle
 * - sender edit/delete actions should be blocked while a pending flag exists
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_message_flag_status'
	) THEN
		CREATE TYPE chat_message_flag_status AS ENUM (
			'pending',
			'safe',
			'deleted'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "chat_message_flags" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- flag identity
	"message_id" UUID NOT NULL,
	"conversation_id" UUID NOT NULL,
	"flagged_by_user_id" UUID NOT NULL,
	"status" chat_message_flag_status NOT NULL DEFAULT 'pending',

	-- review lifecycle
	"reviewed_by_user_id" UUID NULL,
	"reviewed_at" TIMESTAMPTZ NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_message_flags_message_fk"
		FOREIGN KEY ("message_id")
		REFERENCES "chat_messages" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_message_flags_conversation_fk"
		FOREIGN KEY ("conversation_id")
		REFERENCES "chat_conversations" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_message_flags_flagged_by_user_fk"
		FOREIGN KEY ("flagged_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_message_flags_reviewed_by_user_fk"
		FOREIGN KEY ("reviewed_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE SET NULL,

	CONSTRAINT "chat_message_flags_unique_reporter"
		UNIQUE ("message_id", "flagged_by_user_id"),

	CONSTRAINT "chat_message_flags_review_check"
		CHECK (
			(
				"status" = 'pending'
				AND "reviewed_by_user_id" IS NULL
				AND "reviewed_at" IS NULL
			)
			OR (
				"status" <> 'pending'
				AND "reviewed_by_user_id" IS NOT NULL
				AND "reviewed_at" IS NOT NULL
			)
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - finding pending flags for room moderation
 * - checking whether a message is already flagged
 * - listing flags created by one user
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_message_flags_conversation_status"
	ON "chat_message_flags" ("conversation_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_chat_message_flags_message_status"
	ON "chat_message_flags" ("message_id", "status");

CREATE INDEX IF NOT EXISTS "IDX_chat_message_flags_flagged_by_user_id"
	ON "chat_message_flags" ("flagged_by_user_id");
