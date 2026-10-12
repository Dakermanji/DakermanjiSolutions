//! middlewares/flash.js

/**
 * Flash Message Middleware
 *
 * Enables temporary messages stored in the session.
 * Flash messages persist for a single request and are
 * commonly used for notifications such as success,
 * error, or warning messages after redirects.
 *
 * Exposes flash variables to all views:
 * - success
 * - error
 * - warning
 * - info
 */

import flash from 'connect-flash';

const FLASH_TYPES = ['success', 'error', 'errors', 'warning', 'info'];

/**
 * Registers flash message support.
 *
 * @param {import('express').Express} app - Express application instance
 */
export default function configureFlash(app) {
	// Enable flash messages
	app.use(flash());

	// Expose flash messages to views
	app.use((req, res, next) => {
		// Background JSON requests must not consume a pending page message.
		const isJsonRequest = req.accepts(['html', 'json']) === 'json';
		FLASH_TYPES.forEach((type) => {
			res.locals[type] = isJsonRequest ? [] : req.flash(type);
		});

		next();
	});
}
