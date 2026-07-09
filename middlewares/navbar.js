//! middlewares/navbar.js

/**
 * Navigation middleware
 * - Resolves and injects navigation items for the current route
 *
 * Notes:
 * - Designed to scale later for profile / authenticated sections.
 */

import { navbar } from '../config/navbar.js';

/**
 * Extract the first URL segment from a request path.
 * Examples:
 * - "/" -> ""
 * - "/profile/settings" -> "profile"
 */
function firstSegment(path = '/') {
	return path.replace(/^\/+/, '').split('/')[0].toLowerCase();
}

export const navbarMiddleware = (app) => {
	app.use((req, res, next) => {
		// Determine the navigation key based on the first path segment
		const seg = firstSegment(req.path);

		// Root path maps to "index" navigation
		const key = seg === '' ? 'index' : seg;

		// Expose navigation items to views
		res.locals.navbar = Array.isArray(navbar[key]) ? navbar[key] : [];
		res.locals.userAppsNavbar = Array.isArray(navbar.user_apps)
			? navbar.user_apps
			: [];

		// Expose active navigation key for styling / state
		res.locals.activeNavKey = key;

		next();
	});
};
