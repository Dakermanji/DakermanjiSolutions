--! sql/16_chat_direct_conversations.sql
/**
 * Chat Direct Conversations Table
 * -------------------------------
 * Stores the normalized user pair for friend chats and self notes.
 *
 * Why this table exists:
 * - enforce one direct conversation per user pair
 * - support fast direct chat lookup before loading messages
 * - allow self notes as a direct conversation with user_one_id = user_two_id
 *
 * Notes:
 * - user ids should be saved in normalized order
 * - friend eligibility should be enforced by application logic
 */

CREATE TABLE IF NOT EXISTS "chat_direct_conversations" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- direct conversation identity
	"conversation_id" UUID NOT NULL,
	"user_one_id" UUID NOT NULL,
	"user_two_id" UUID NOT NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_direct_conversations_conversation_fk"
		FOREIGN KEY ("conversation_id")
		REFERENCES "chat_conversations" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_direct_conversations_user_one_fk"
		FOREIGN KEY ("user_one_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_direct_conversations_user_two_fk"
		FOREIGN KEY ("user_two_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	-- conversation can only have one direct identity
	CONSTRAINT "UQ_chat_direct_conversations_conversation"
		UNIQUE ("conversation_id"),

	-- keep user pairs normalized so uniqueness is reliable
	CONSTRAINT "chat_direct_conversations_user_order_check"
		CHECK ("user_one_id" <= "user_two_id"),

	-- prevent duplicate direct chats, including self notes
	CONSTRAINT "UQ_chat_direct_conversations_users"
		UNIQUE ("user_one_id", "user_two_id")
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - direct chat lookup by normalized user pair
 * - finding direct chats for either participant
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_direct_conversations_user_one_two"
	ON "chat_direct_conversations" ("user_one_id", "user_two_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_direct_conversations_user_one_id"
	ON "chat_direct_conversations" ("user_one_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_direct_conversations_user_two_id"
	ON "chat_direct_conversations" ("user_two_id");
