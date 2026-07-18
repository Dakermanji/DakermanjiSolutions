--! sql/18_chat_room_join_requests.sql
/**
 * Chat Room Join Requests Table
 * -----------------------------
 * Stores user-initiated requests to join listed private rooms.
 *
 * Why this table exists:
 * - keep pending access separate from active room membership
 * - allow owners/admins to approve or reject requests
 * - preserve a small audit trail for who reviewed a request
 *
 * Notes:
 * - public rooms should create membership directly instead of using this table
 * - private unlisted rooms should use invitations instead of join requests
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'chat_room_join_request_status'
	) THEN
		CREATE TYPE chat_room_join_request_status AS ENUM (
			'pending',
			'approved',
			'rejected',
			'canceled'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "chat_room_join_requests" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- request identity
	"room_id" UUID NOT NULL,
	"requested_by_user_id" UUID NOT NULL,
	"reviewed_by_user_id" UUID NULL,

	-- request state
	"status" chat_room_join_request_status NOT NULL DEFAULT 'pending',
	"reviewed_at" TIMESTAMPTZ NULL,
	"canceled_at" TIMESTAMPTZ NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "chat_room_join_requests_room_fk"
		FOREIGN KEY ("room_id")
		REFERENCES "chat_rooms" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_room_join_requests_requested_by_user_fk"
		FOREIGN KEY ("requested_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "chat_room_join_requests_reviewed_by_user_fk"
		FOREIGN KEY ("reviewed_by_user_id")
		REFERENCES "users" ("id")
		ON DELETE SET NULL,

	-- keep timestamps aligned with the current request state
	CONSTRAINT "chat_room_join_requests_status_timestamp_check"
		CHECK (
			("status" = 'pending' AND "reviewed_at" IS NULL AND "canceled_at" IS NULL)
			OR ("status" IN ('approved', 'rejected') AND "reviewed_at" IS NOT NULL AND "canceled_at" IS NULL)
			OR ("status" = 'canceled' AND "reviewed_at" IS NULL AND "canceled_at" IS NOT NULL)
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - owner/admin pending request lists by room
 * - user pending request state in room search
 * - preventing duplicate pending requests
 */
CREATE INDEX IF NOT EXISTS "IDX_chat_room_join_requests_room_status"
	ON "chat_room_join_requests" ("room_id", "status");

CREATE INDEX IF NOT EXISTS "IDX_chat_room_join_requests_user_status"
	ON "chat_room_join_requests" ("requested_by_user_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_room_join_requests_pending_room_user"
	ON "chat_room_join_requests" ("room_id", "requested_by_user_id")
	WHERE "status" = 'pending';
