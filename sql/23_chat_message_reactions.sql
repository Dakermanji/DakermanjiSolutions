--! sql/23_chat_message_reactions.sql
/**
 * Chat Message Reactions Table
 * ----------------------------
 * Stores lightweight emoji reactions attached to chat messages.
 *
 * Why this table exists:
 * - let members react without creating extra chat messages
 * - keep reaction counts queryable per message
 * - allow one user to add each supported reaction only once per message
 *
 * Notes:
 * - application constants control which reactions are allowed
 * - application logic controls who can react to a message
 * - deleted messages remove their reactions through the message foreign key
 */

CREATE TABLE IF NOT EXISTS "chat_message_reactions" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- reaction identity
	"message_id" UUID NOT NULL,
	"user_id" UUID NOT NULL,
	"reaction" VARCHAR(32) NOT NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_message_reactions_message_fk"
		FOREIGN KEY ("message_id")
		REFERENCES "chat_messages" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_message_reactions_user_fk"
		FOREIGN KEY ("user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_message_reactions_unique_user_reaction"
		UNIQUE ("message_id", "user_id", "reaction"),

	CONSTRAINT "chat_message_reactions_reaction_check"
		CHECK (LENGTH(BTRIM("reaction")) > 0)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - grouping reaction counts by message
 * - finding reactions added by one user
 * - listing recent reaction activity if needed later
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_message_reactions_message_id"
	ON "chat_message_reactions" ("message_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_message_reactions_user_id"
	ON "chat_message_reactions" ("user_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_message_reactions_created_at"
	ON "chat_message_reactions" ("created_at");
