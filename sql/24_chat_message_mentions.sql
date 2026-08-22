--! sql/24_chat_message_mentions.sql
/**
 * Chat Message Mentions Table
 * ---------------------------
 * Stores resolved users mentioned inside chat messages.
 *
 * Why this table exists:
 * - keep mentions queryable without reparsing message text
 * - prevent duplicate mention rows for the same user in one message
 * - support mention notifications and future mention highlighting/search
 *
 * Notes:
 * - application logic controls which users can be mentioned
 * - deleted messages remove their mentions through the message foreign key
 * - deleting a user removes their mention rows through the user foreign key
 */

CREATE TABLE IF NOT EXISTS "chat_message_mentions" (
	-- mention identity
	"message_id" UUID NOT NULL,
	"mentioned_user_id" UUID NOT NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_message_mentions_message_fk"
		FOREIGN KEY ("message_id")
		REFERENCES "chat_messages" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_message_mentions_user_fk"
		FOREIGN KEY ("mentioned_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_message_mentions_pk"
		PRIMARY KEY ("message_id", "mentioned_user_id")
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - finding all users mentioned in a message
 * - finding recent mentions for one user
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_message_mentions_mentioned_user_id"
	ON "chat_message_mentions" ("mentioned_user_id", "created_at");
