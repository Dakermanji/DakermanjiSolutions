--! sql/19_chat_room_invitations.sql
/**
 * Chat Room Invitations Table
 * ---------------------------
 * Stores owner/admin invitations for users to join rooms.
 *
 * Why this table exists:
 * - support private unlisted rooms without public discovery
 * - let invited users accept or reject room access
 * - preserve a small audit trail for who sent or revoked an invitation
 *
 * Notes:
 * - accepted invitations should create a chat_conversation_members row
 * - revoked invitations should no longer be actionable
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_room_invitation_status'
	) THEN
		CREATE TYPE chat_room_invitation_status AS ENUM (
			'pending',
			'accepted',
			'rejected',
			'revoked'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "chat_room_invitations" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- invitation identity
	"room_id" UUID NOT NULL,
	"invited_user_id" UUID NOT NULL,
	"invited_by_user_id" UUID NOT NULL,
	"revoked_by_user_id" UUID NULL,

	-- invitation state
	"status" chat_room_invitation_status NOT NULL DEFAULT 'pending',
	"responded_at" TIMESTAMPTZ NULL,
	"revoked_at" TIMESTAMPTZ NULL,
	"expires_at" TIMESTAMPTZ NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_room_invitations_room_fk"
		FOREIGN KEY ("room_id")
		REFERENCES "chat_rooms" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_room_invitations_invited_user_fk"
		FOREIGN KEY ("invited_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_room_invitations_invited_by_user_fk"
		FOREIGN KEY ("invited_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_room_invitations_revoked_by_user_fk"
		FOREIGN KEY ("revoked_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE SET NULL,

	-- users cannot invite themselves through the invitation flow
	CONSTRAINT "chat_room_invitations_invited_user_check"
		CHECK ("invited_user_id" <> "invited_by_user_id"),

	-- keep timestamps aligned with the current invitation state
	CONSTRAINT "chat_room_invitations_status_timestamp_check"
		CHECK (
			("status" = 'pending' AND "responded_at" IS NULL AND "revoked_at" IS NULL)
			OR ("status" IN ('accepted', 'rejected') AND "responded_at" IS NOT NULL AND "revoked_at" IS NULL)
			OR ("status" = 'revoked' AND "responded_at" IS NULL AND "revoked_at" IS NOT NULL)
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - user invitation lists
 * - owner/admin pending invitation lists by room
 * - preventing duplicate pending invitations
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_room_invitations_invited_user_status"
	ON "chat_room_invitations" ("invited_user_id", "status");

CREATE INDEX IF NOT EXISTS "IDX_chat_room_invitations_room_status"
	ON "chat_room_invitations" ("room_id", "status");

CREATE INDEX IF NOT EXISTS "IDX_chat_room_invitations_invited_by_user_id"
	ON "chat_room_invitations" ("invited_by_user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_room_invitations_pending_room_user"
	ON "chat_room_invitations" ("room_id", "invited_user_id")
	WHERE "status" = 'pending';
