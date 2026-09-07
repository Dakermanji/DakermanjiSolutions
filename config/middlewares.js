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

export default function applyMiddlewares(app) {
	// Apply security-related HTTP headers first
	securityHeaders(app);

	// Log all incoming HTTP requests
	requestLogger(app);

	// Parse incoming request bodies (JSON and URL-encoded form data)
	parsers(app);

	// Enable session support
	session(app);

	// Initialize Passport and restore session user
	passport(app);

	// Flash messages
	flash(app);

	// Register i18next middleware (language detection + view helpers)
	i18nextMiddlewares(app);

	// Protect unsafe requests with a token stored in the visitor's session
	csrf(app);

	// Pass Global locals including Flash
	locals(app);

	// Resolve and inject navigation items for the current route
	navbarMiddleware(app);

	// Enable serving static files such as stylesheets, scripts, and images
	staticFiles(app);

	// Redirect unauthenticated visitors away from protected routes
	routeAccess(app);

	// Keep authenticated users without usernames in the signup completion flow
	signupCompletionAccess(app);
}
