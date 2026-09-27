//! middlewares/locals.js

import env from '../config/dotenv.js';
import { getThemePreference } from '../services/theme/preference.js';

/**
 * Locals Middleware
 *
 * Exposes shared non-i18n view locals to all templates.
 *
 * Notes:
 * - `styles` and `scripts` are page-level asset arrays consumed by the layout.
 * - `user` is populated from Passport when a session is authenticated.
 * - `currentRoute` is used to mark active navigation items.
 * - `currentUrl` is used for redirects and return-to flows.
 */

export default function configureLocals(app) {
	app.use((req, res, next) => {
		// Dynamic page assets
		res.locals.styles = [];
		res.locals.scripts = [];

		// Authenticated user from Passport session
		res.locals.user = req.user ?? null;
		res.locals.isAuthenticated = req.isAuthenticated?.() ?? false;
		res.locals.appReturnTo = req.session.appReturnTo || '/';
		res.locals.currentTheme = getThemePreference(req);

		// Current route path for active navbar state
		res.locals.currentRoute = req.path;

		// Full URL including query params
		res.locals.currentUrl = req.originalUrl;

		// Passing email for consistency
		res.locals.email = env.EMAIL_ADMIN;

		// Flash locals:
		res.locals.modal = req.flash('modal')[0] || null;

		if (req.query?.deleted === 'account') {
			res.locals.success = [
				...(res.locals.success || []),
				'profile:danger.deleted',
			];
		}

		next();
	});
}
