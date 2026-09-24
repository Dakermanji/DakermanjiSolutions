--! sql/12_external_api_request_logs.sql
/**
 * External API Request Logs Table
 * -------------------------------
 * Stores outbound third-party API call attempts.
 *
 * Why this table exists:
 * - support rate limits across multiple windows
 * - track usage by signed-in user
 * - keep provider/API usage auditable before paid API integration
 *
 * Notes:
 * - user_id is required because API-backed routes are user-only
 * - provider groups API families such as weather, geolocation, or unsplash
 * - request_key can group actions such as forecast, city_search, or background
 * - response_status and error_code are nullable because requests may fail before
 *   an upstream response exists
 */

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'external_api_provider'
	) THEN
		CREATE TYPE external_api_provider AS ENUM (
			'weather',
			'geolocation',
			'unsplash'
		);
	END IF;
END$$;

-- ALTER TYPE external_api_provider ADD VALUE IF NOT EXISTS 'weather';
-- ALTER TYPE external_api_provider ADD VALUE IF NOT EXISTS 'geolocation';
-- ALTER TYPE external_api_provider ADD VALUE IF NOT EXISTS 'unsplash';

CREATE TABLE IF NOT EXISTS "external_api_request_logs" (
	"id" UUID PRIMARY KEY,

	-- caller identity
	"user_id" UUID NOT NULL,

	-- API target
	"provider" external_api_provider NOT NULL,
	"request_key" VARCHAR(80) NOT NULL,

	-- optional request context
	"route" TEXT NULL,
	"method" VARCHAR(12) NULL,

	-- optional response context
	"response_status" INTEGER NULL,
	"error_code" VARCHAR(120) NULL,

	-- timestamps
	"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- foreign keys
	CONSTRAINT "external_api_request_logs_user_fk"
		FOREIGN KEY ("user_id")
		REFERENCES "users" ("id")
		ON DELETE CASCADE,

	-- sanity checks
	CONSTRAINT "external_api_request_logs_response_status_check"
		CHECK (
			"response_status" IS NULL
			OR ("response_status" >= 100 AND "response_status" <= 599)
		)
);

/**
 * Indexes
 * -------
 * Optimized for:
 * - counting requests by user/provider/key over time windows
 * - pruning old logs
 * - auditing provider usage
 */
CREATE INDEX IF NOT EXISTS "IDX_external_api_request_logs_user_window"
	ON "external_api_request_logs" (
		"user_id",
		"provider",
		"request_key",
		"created_at"
	);

CREATE INDEX IF NOT EXISTS "IDX_external_api_request_logs_provider_created_at"
	ON "external_api_request_logs" ("provider", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_external_api_request_logs_created_at"
	ON "external_api_request_logs" ("created_at");
