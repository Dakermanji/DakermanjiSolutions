--! sql/22_chat_room_activity_logs.sql
/**
 * Chat Room Activity Logs Table
 * -----------------------------
 * Stores owner/admin room actions for activity history and moderation context.
 *
 * Why this table exists:
 * - keep room activity separate from user-facing notifications
 * - preserve a readable trail for owner/admin decisions
 * - support room management history without changing each source table
 *
 * Notes:
 * - actor_user_id can be NULL for system-created activity
 * - target_user_id is optional because some actions affect the room itself
 * - metadata stores action context such as request ids, changed fields, or reasons
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_room_activity_action'
	) THEN
		CREATE TYPE chat_room_activity_action AS ENUM (
			'room_invitation_queued',
			'member_invited',
			'room_invitation_accepted',
			'room_invitation_rejected',
			'join_request_approved',
			'join_request_rejected',
			'member_promoted',
			'admin_demoted',
			'member_muted',
			'member_unmuted',
			'member_removed',
			'member_banned',
			'member_unbanned',
			'member_history_deleted',
			'room_info_updated',
			'message_flagged',
			'message_marked_safe',
			'flagged_message_deleted',
			'message_deleted_by_admin'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "chat_room_activity_logs" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- activity location
	"room_id" UUID NOT NULL,
	"conversation_id" UUID NOT NULL,

	-- activity participants
	"actor_user_id" UUID NULL,
	"target_user_id" UUID NULL,

	-- activity details
	"action" chat_room_activity_action NOT NULL,
	"entity_type" VARCHAR(80) NULL,
	"entity_id" UUID NULL,
	"metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_room_activity_logs_room_fk"
		FOREIGN KEY ("room_id")
		REFERENCES "chat_rooms" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_room_activity_logs_conversation_fk"
		FOREIGN KEY ("conversation_id")
		REFERENCES "chat_conversations" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_room_activity_logs_actor_user_fk"
		FOREIGN KEY ("actor_user_id")
		REFERENCES "users" ("id")
		ON DELETE SET NULL,

	CONSTRAINT "chat_room_activity_logs_target_user_fk"
		FOREIGN KEY ("target_user_id")
		REFERENCES "users" ("id")
		ON DELETE SET NULL,

	-- entity references should be complete when present
	CONSTRAINT "chat_room_activity_logs_entity_check"
		CHECK (
			("entity_type" IS NULL AND "entity_id" IS NULL)
			OR ("entity_type" IS NOT NULL AND "entity_id" IS NOT NULL)
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - listing recent activity for one room
 * - filtering by action for moderation/history views
 * - finding activity linked to domain rows such as join requests or messages
 * - querying structured metadata when needed
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_room_activity_logs_room_created_at"
	ON "chat_room_activity_logs" ("room_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "IDX_chat_room_activity_logs_conversation_created_at"
	ON "chat_room_activity_logs" ("conversation_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "IDX_chat_room_activity_logs_actor_user_id"
	ON "chat_room_activity_logs" ("actor_user_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_room_activity_logs_target_user_id"
	ON "chat_room_activity_logs" ("target_user_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_room_activity_logs_action"
	ON "chat_room_activity_logs" ("action");

CREATE INDEX IF NOT EXISTS "IDX_chat_room_activity_logs_entity"
	ON "chat_room_activity_logs" ("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "IDX_chat_room_activity_logs_metadata"
	ON "chat_room_activity_logs"
	USING GIN ("metadata");
