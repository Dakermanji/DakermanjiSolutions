--! sql/08_user_follow_requests.sql
/**
 * User Follow Requests Table
 * --------------------------
 * Tracks follow requests between users before a follow relationship exists.
 *
 * Why this table exists:
 * - prevent direct follow creation without approval
 * - support pending / accepted / rejected / canceled states
 * - preserve request history over time
 *
 * Notes:
 * - one user cannot request to follow themselves
 * - only one pending request is allowed per requester -> target pair
 * - accepted requests should later create a row in user_follows
 * - block rules should be enforced by application logic
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'follow_request_status'
	) THEN
		CREATE TYPE follow_request_status AS ENUM (
			'pending',
			'accepted',
			'rejected',
			'canceled'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "user_follow_requests" (
	"id" UUID PRIMARY KEY,

	-- user who sends the follow request
	"requester_id" UUID NOT NULL,

	-- user who receives the follow request
	"target_id" UUID NOT NULL,

	-- current request state
	"status" follow_request_status NOT NULL DEFAULT 'pending',

	-- when the request was handled (accepted / rejected / canceled)
	"responded_at" TIMESTAMPTZ NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),

	-- foreign keys
	CONSTRAINT "user_follow_requests_requester_fk"
		FOREIGN KEY ("requester_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "user_follow_requests_target_fk"
		FOREIGN KEY ("target_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	-- prevent self-follow requests
	CONSTRAINT "user_follow_requests_requester_target_check"
		CHECK ("requester_id" <> "target_id")
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - incoming requests lookup by target
 * - outgoing requests lookup by requester
 * - filtering by status
 * - sorting by recency
 */
CREATE INDEX IF NOT EXISTS "IDX_user_follow_requests_requester_id"
	ON "user_follow_requests" ("requester_id");

CREATE INDEX IF NOT EXISTS "IDX_user_follow_requests_target_id"
	ON "user_follow_requests" ("target_id");

CREATE INDEX IF NOT EXISTS "IDX_user_follow_requests_status"
	ON "user_follow_requests" ("status");

CREATE INDEX IF NOT EXISTS "IDX_user_follow_requests_created_at"
	ON "user_follow_requests" ("created_at");

CREATE INDEX IF NOT EXISTS "IDX_user_follow_requests_target_id_status"
	ON "user_follow_requests" ("target_id", "status");

CREATE INDEX IF NOT EXISTS "IDX_user_follow_requests_requester_id_status"
	ON "user_follow_requests" ("requester_id", "status");

/**
 * Unique pending request
 * ----------------------
 * Allows request history while preventing duplicate active requests
 * for the same requester -> target pair.
 */
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_user_follow_requests_pending_pair"
	ON "user_follow_requests" ("requester_id", "target_id")
	WHERE "status" = 'pending';
