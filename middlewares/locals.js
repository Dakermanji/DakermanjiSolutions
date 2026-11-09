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

		// Public business contact details
		res.locals.email = env.EMAIL_ADMIN;
		res.locals.contactPhone = env.CONTACT_PHONE;
		res.locals.contactPhoneHref = env.CONTACT_PHONE
			? `tel:${env.CONTACT_PHONE.replace(/[^\d+]/g, '')}`
			: '';
		const contactPhoneDigits = env.CONTACT_PHONE.replace(/\D/g, '');
		const hasInternationalPhone = env.CONTACT_PHONE.startsWith('+') || /^1\d{10}$/.test(contactPhoneDigits);
		res.locals.contactWhatsAppHref = hasInternationalPhone && /^\d{8,15}$/.test(contactPhoneDigits)
			? `https://wa.me/${contactPhoneDigits}`
			: '';
		res.locals.companyName = env.COMPANY_NAME;

		// Flash locals:
		// Keep modal feedback for the next HTML page when JSON is fetched.
		res.locals.modal = req.accepts(['html', 'json']) === 'json'
			? null
			: req.flash('modal')[0] || null;

		if (req.query?.deleted === 'account') {
			res.locals.success = [
				...(res.locals.success || []),
				'profile:danger.deleted',
			];
		}

		next();
	});
}
