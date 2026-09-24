//! config/dotenv.js

/**
 * Normalized environment configuration
 *
 * Responsibilities:
 * - Read application environment variables through helper functions
 * - Convert raw string values into normalized application-friendly values
 * - Expose a single configuration object for the rest of the app
 *
 * Why this file exists:
 * - Keeps raw `process.env` access out of the codebase
 * - Centralizes defaults, required values, and type conversion
 * - Makes configuration easier to maintain, validate, and test
 *
 * Notes:
 * - Required values should use `requireEnv()`
 * - Optional values should use `optionalEnv()`
 * - Type normalization (e.g. number / boolean) should happen here
 */

import { requireEnv, optionalEnv } from '../utils/config/dotenv.js';

/**
 * Application environment configuration
 */
const env = {
	/** Current application environment */
	NODE_ENV: optionalEnv('NODE_ENV', 'development'),
	REQUEST_TIMING: optionalEnv('REQUEST_TIMING', 'false') === 'true',

	/** Port where the Express server will listen */
	PORT: Number(optionalEnv('PORT', 3000)),

	/** Base URL used for server/client references */
	CLIENT_URL: optionalEnv('CLIENT_URL', 'http://localhost:3000'),

	/** Sentry Data Source Name used for remote error monitoring */
	SENTRY_DSN: optionalEnv('SENTRY_DSN', ''),

	/** OpenWeather API key used for weather forecast data */
	OPENWEATHER_API_KEY: optionalEnv('OPENWEATHER_API_KEY', ''),

	/** Unsplash access key used for weather background images */
	UNSPLASH_ACCESS_KEY: optionalEnv('UNSPLASH_ACCESS_KEY', ''),

	/** Secret used to sign session cookies */
	SESSION_SECRET: requireEnv('SESSION_SECRET'),

	/** Admin email */
	EMAIL_ADMIN: requireEnv('EMAIL_ADMIN'),
	EMAIL_PASSWORD: requireEnv('EMAIL_PASSWORD'),
	EMAIL_SERVICE: requireEnv('EMAIL_SERVICE'),
	EMAIL_HOST: requireEnv('EMAIL_HOST'),
	EMAIL_PORT: optionalEnv('EMAIL_PORT', 465),

	/** PostgreSQL host */
	DB_HOST: optionalEnv('DB_HOST', 'localhost'),

	/** PostgreSQL port */
	DB_PORT: Number(optionalEnv('DB_PORT', 5432)),

	/** PostgreSQL database name */
	DB_NAME: optionalEnv('DB_NAME', 'DakermanjiSolutions'),

	/** PostgreSQL username */
	DB_USER: optionalEnv('DB_USER', 'postgres'),

	/** PostgreSQL password */
	DB_PASSWORD: requireEnv('DB_PASSWORD'),

	/** Whether PostgreSQL SSL is enabled */
	DB_SSL: optionalEnv('DB_SSL', 'false') === 'true',

	/** Optional CA certificate used to verify the PostgreSQL server */
	DB_SSL_CA_PATH: optionalEnv('DB_SSL_CA_PATH', ''),

	/** Google OAuth */
	GOOGLE_CLIENT_ID: requireEnv('GOOGLE_CLIENT_ID'),
	GOOGLE_CLIENT_SECRET: requireEnv('GOOGLE_CLIENT_SECRET'),
	GOOGLE_CALLBACK_URL: requireEnv('GOOGLE_CALLBACK_URL'),

	/** GitHub OAuth */
	GITHUB_CLIENT_ID: requireEnv('GITHUB_CLIENT_ID'),
	GITHUB_CLIENT_SECRET: requireEnv('GITHUB_CLIENT_SECRET'),
	GITHUB_CALLBACK_URL: requireEnv('GITHUB_CALLBACK_URL'),

	/** Discord OAuth */
	DISCORD_CLIENT_ID: requireEnv('DISCORD_CLIENT_ID'),
	DISCORD_CLIENT_SECRET: requireEnv('DISCORD_CLIENT_SECRET'),
	DISCORD_CALLBACK_URL: requireEnv('DISCORD_CALLBACK_URL'),
};

export default env;
