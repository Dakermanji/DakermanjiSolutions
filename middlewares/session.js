//! middlewares/session.js

/**
 * Session Middleware
 *
 * Responsibilities:
 * - Configure Express session management
 * - Persist sessions in PostgreSQL instead of memory
 * - Define cookie security and expiration behavior
 *
 * Why this file exists:
 * - Centralizes session configuration in one place
 * - Keeps authentication/session logic out of the app bootstrap
 * - Ensures sessions survive server restarts
 *
 * Notes:
 * - Uses `connect-pg-simple` as the PostgreSQL session store
 * - Uses the shared PostgreSQL pool from `config/database.js`
 * - Expects the session table to exist before the app starts
 */

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import env from '../config/dotenv.js';
import pool from '../config/database.js';

const PgStore = connectPgSimple(session);
export const SESSION_COOKIE_NAME = 'ds.sid';

export const sessionMiddleware = session({
	/**
	 * Session store
	 *
	 * Stores sessions in PostgreSQL instead of the default
	 * in-memory store, which is not suitable for production.
	 */
	store: new PgStore({
		pool,
		tableName: 'session',
		createTableIfMissing: false,
	}),

	/**
	 * Session cookie name
	 *
	 * Custom name avoids the default `connect.sid`
	 * and makes the app cookie easier to identify.
	 */
	name: SESSION_COOKIE_NAME,

	/**
	 * Secret used to sign the session ID cookie
	 */
	secret: env.SESSION_SECRET,

	/**
	 * Do not save the session back to the store
	 * if it was not modified during the request.
	 */
	resave: false,

	/**
	 * Do not create session records for unauthenticated
	 * or otherwise empty sessions.
	 */
	saveUninitialized: false,

	/**
	 * Refresh cookie expiration on every response.
	 *
	 * This keeps active users signed in as long as
	 * they continue interacting with the app.
	 */
	rolling: true,

	cookie: {
		/**
		 * Prevent client-side JavaScript
		 * from accessing the cookie.
		 */
		httpOnly: true,

		/**
		 * Only send cookie over HTTPS in production.
		 */
		secure: env.NODE_ENV === 'production',

		/**
		 * Helps reduce CSRF risk while keeping
		 * normal same-site navigation working.
		 */
		sameSite: 'lax',

		/**
		 * Session cookie lifespan: 1 day
		 */
		maxAge: 1000 * 60 * 60 * 24,
	},
});

/**
 * Registers the session middleware.
 *
 * @param {import('express').Express} app - Express application instance
 */
export default function configureSession(app) {
	app.use(sessionMiddleware);
}
