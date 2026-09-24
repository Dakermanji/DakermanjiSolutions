//! config/middlewares.js

/**
 * Global Middleware Registry
 *
 * Applies all application-level middlewares in the correct order.
 * Keep this file as the central place for middleware composition.
 */

import securityHeaders from '../middlewares/securityHeaders.js';
import requestLogger from '../middlewares/requestLogger.js';
import parsers from '../middlewares/parsers.js';
import session from '../middlewares/session.js';
import passport from '../middlewares/passport.js';
import flash from '../middlewares/flash.js';
import csrf from '../middlewares/csrf.js';
import locals from '../middlewares/locals.js';
import i18nextMiddlewares from '../middlewares/i18n.js';
import staticFiles from '../middlewares/staticFiles.js';
import routeAccess from '../middlewares/routeAccess.js';
import signupCompletionAccess from '../middlewares/signupCompletionAccess.js';
import { navbarMiddleware } from '../middlewares/navbar.js';
import { startRequestTiming, markRequestTiming } from '../middlewares/requestTiming.js';

export default function applyMiddlewares(app) {
	// Apply security-related HTTP headers first
	securityHeaders(app);

	// Log all incoming HTTP requests
	requestLogger(app);

	// Public assets do not need sessions, user lookups, or navigation queries.
	// Keep security headers and logging above static serving.
	staticFiles(app);
	startRequestTiming(app);

	// Parse incoming request bodies (JSON and URL-encoded form data)
	parsers(app);
	markRequestTiming(app, 'parsingMs');

	// Enable session support
	session(app);
	markRequestTiming(app, 'sessionMs');

	// Initialize Passport and restore session user
	passport(app);
	markRequestTiming(app, 'passportMs');

	// Flash messages
	flash(app);

	// Register i18next middleware (language detection + view helpers)
	i18nextMiddlewares(app);

	// Protect unsafe requests with a token stored in the visitor's session
	csrf(app);

	// Pass Global locals including Flash
	locals(app);
	markRequestTiming(app, 'viewSetupMs');

	// Resolve and inject navigation items for the current route
	navbarMiddleware(app);
	markRequestTiming(app, 'navbarMs');

	// Redirect unauthenticated visitors away from protected routes
	routeAccess(app);

	// Keep authenticated users without usernames in the signup completion flow
	signupCompletionAccess(app);
}
