//! middlewares/csrf.js

import { csrfSync } from 'csrf-sync';

const CSRF_FIELD_NAME = '_csrf';

const { csrfSynchronisedProtection, generateToken } = csrfSync({
	getTokenFromRequest: (req) =>
		req.body?.[CSRF_FIELD_NAME] || req.headers['x-csrf-token'],
});

/**
 * Protects unsafe requests and exposes a session-bound token to every view.
 * Body parsing and session middleware must run before this middleware.
 *
 * @param {import('express').Express} app
 */
export default function configureCsrf(app) {
	app.use((req, res, next) => {
		if (req.get('accept')?.includes('text/html')) {
			res.locals.csrfToken = generateToken(req);
			res.locals.csrfFieldName = CSRF_FIELD_NAME;
		}

		next();
	});
	app.use(csrfSynchronisedProtection);
}
