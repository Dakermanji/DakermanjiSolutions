--! sql/20_app_notifications.sql
/**
 * App Notifications Table
 * -----------------------
 * Stores general notifications for app events, requests, and actions.
 *
 * Why this table exists:
 * - provide one notification inbox and navbar badge across app features
 * - keep unread/read/dismissed/responded state in one place
 * - support actionable notifications without duplicating notification logic per app
 * - reference domain-specific source rows such as chat invitations or project requests
 *
 * Notes:
 * - app_key is intentionally readable text, such as chat, weather, projects, or admin
 * - domain tables remain the source of truth for action state
 * - response_key stays flexible because different apps can have different actions
 * - data stores display context such as roomName, conversationId, or request labels
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'app_notification_priority'
	) THEN
		CREATE TYPE app_notification_priority AS ENUM (
			'low',
			'normal',
			'high'
		);
	END IF;
END$$;

CREATE TABLE IF NOT EXISTS "app_notifications" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

	-- recipient / source
	"recipient_user_id" UUID NOT NULL,
	"actor_user_id" UUID NULL,
	"app_key" VARCHAR(32) NOT NULL,
	"type" VARCHAR(80) NOT NULL,

	-- optional domain reference
	"entity_type" VARCHAR(80) NULL,
	"entity_id" UUID NULL,

	-- display / routing
	"title_key" VARCHAR(160) NULL,
	"body_key" VARCHAR(160) NULL,
	"link_url" VARCHAR(500) NULL,
	"data" JSONB NOT NULL DEFAULT '{}'::jsonb,

	-- state
	"priority" app_notification_priority NOT NULL DEFAULT 'normal',
	"read_at" TIMESTAMPTZ NULL,
	"dismissed_at" TIMESTAMPTZ NULL,
	"responded_at" TIMESTAMPTZ NULL,
	"response_key" VARCHAR(40) NULL,

	-- optional lifecycle
	"expires_at" TIMESTAMPTZ NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "app_notifications_recipient_user_fk"
		FOREIGN KEY ("recipient_user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	CONSTRAINT "app_notifications_actor_user_fk"
		FOREIGN KEY ("actor_user_id")
		REFERENCES "users" ("id")
		ON DELETE SET NULL,

	-- response_key should only exist after a response is recorded
	CONSTRAINT "app_notifications_response_check"
		CHECK (
			("responded_at" IS NULL AND "response_key" IS NULL)
			OR ("responded_at" IS NOT NULL AND "response_key" IS NOT NULL)
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - listing a user's notification inbox by newest first
 * - counting unread navbar notifications
 * - hiding dismissed notifications
 * - filtering by app/type
 * - finding notifications linked to domain rows
 * - querying structured JSON context when needed
 */
CREATE INDEX IF NOT EXISTS "IDX_app_notifications_recipient_created_at"
	ON "app_notifications" ("recipient_user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "IDX_app_notifications_recipient_read_at"
	ON "app_notifications" ("recipient_user_id", "read_at");

CREATE INDEX IF NOT EXISTS "IDX_app_notifications_recipient_dismissed_at"
	ON "app_notifications" ("recipient_user_id", "dismissed_at");

CREATE INDEX IF NOT EXISTS "IDX_app_notifications_app_type"
	ON "app_notifications" ("app_key", "type");

CREATE INDEX IF NOT EXISTS "IDX_app_notifications_entity"
	ON "app_notifications" ("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "IDX_app_notifications_data"
	ON "app_notifications"
	USING GIN ("data");
