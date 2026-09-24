--! sql/11_user_social_notifications.sql
/**
 * User Social Notifications Table
 * -------------------------------
 * Stores user-to-user social notifications.
 *
 * Why this table exists:
 * - notify users about social actions
 * - support follow request workflow
 * - track read / handled state for social notifications
 *
 * Notes:
 * - this table is intentionally limited to social notifications
 * - follow request notifications may reference user_follow_requests
 * - notification side effects should be enforced by application logic
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'user_social_notification_type'
	) THEN
		CREATE TYPE user_social_notification_type AS ENUM (
			'follow_started',
			'follow_request',
			'follow_request_accepted',
			'follow_request_accepted_followed_back',
			'follow_request_rejected'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "user_social_notifications" (
	"id" UUID PRIMARY KEY,

	-- user who receives the notification
	"recipient_id" UUID NOT NULL,

	-- user who triggered the notification
	"actor_id" UUID NOT NULL,

	-- social notification type
	"type" user_social_notification_type NOT NULL,

	-- optional related follow request
	"follow_request_id" UUID NULL,

	-- read state
	"is_read" BOOLEAN NOT NULL DEFAULT FALSE,
	"read_at" TIMESTAMPTZ NULL,

	-- handled state (useful for actionable notifications)
	"is_handled" BOOLEAN NOT NULL DEFAULT FALSE,
	"handled_at" TIMESTAMPTZ NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW (),

	-- foreign keys
	CONSTRAINT "user_social_notifications_recipient_fk"
		FOREIGN KEY ("recipient_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "user_social_notifications_actor_fk"
		FOREIGN KEY ("actor_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "user_social_notifications_follow_request_fk"
		FOREIGN KEY ("follow_request_id")
		REFERENCES "user_follow_requests" ("id")
		ON DELETE CASCADE,

	-- prevent self-notifications
	CONSTRAINT "user_social_notifications_recipient_actor_check"
		CHECK ("recipient_id" <> "actor_id")
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - recipient notification feed
 * - unread notification checks
 * - actionable notification lookups
 * - sorting by recency
 */
CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_recipient_id"
	ON "user_social_notifications" ("recipient_id");

CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_actor_id"
	ON "user_social_notifications" ("actor_id");

CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_type"
	ON "user_social_notifications" ("type");

CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_follow_request_id"
	ON "user_social_notifications" ("follow_request_id");

CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_created_at"
	ON "user_social_notifications" ("created_at");

CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_recipient_id_created_at"
	ON "user_social_notifications" ("recipient_id", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_recipient_id_is_read"
	ON "user_social_notifications" ("recipient_id", "is_read");

CREATE INDEX IF NOT EXISTS "IDX_user_social_notifications_recipient_id_is_handled"
	ON "user_social_notifications" ("recipient_id", "is_handled");
