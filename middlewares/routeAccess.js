//! middlewares/routeAccess.js

/**
 * Route Access Middleware
 *
 * Keeps public routes reachable while sending unauthenticated visitors
 * back to the homepage for protected application routes.
 */

const PUBLIC_EXACT_ROUTES = new Set(['/']);

const PUBLIC_PREFIXES = [
	'/auth/signup',
	'/auth/signin',
	'/auth/verify-email',
	'/auth/complete-local-signup',
	'/auth/recovery',
	'/auth/reset-password',
	'/auth/google',
	'/auth/github',
	'/auth/discord',
	'/avatar',
	'/language',
];

const ASSET_PATH_PATTERN = /\.[a-z0-9]+$/i;

function normalizePath(path = '/') {
	if (path.length > 1) {
		return path.replace(/\/+$/, '');
	}

	return path;
}

function isPublicRoute(path) {
	if (PUBLIC_EXACT_ROUTES.has(path)) {
		return true;
	}

	return PUBLIC_PREFIXES.some(
		(prefix) => path === prefix || path.startsWith(`${prefix}/`),
	);
}

function acceptsHtml(req) {
	return req.accepts(['html', 'json']) === 'html';
}

export default function routeAccess(app) {
	app.use((req, res, next) => {
		const path = normalizePath(req.path);
		const isAuthenticated = req.isAuthenticated?.() ?? false;

		if (
			isAuthenticated ||
			isPublicRoute(path) ||
			ASSET_PATH_PATTERN.test(path)
		) {
			return next();
		}

		if (acceptsHtml(req)) {
			return res.redirect('/');
		}

		return res.status(401).json({
			error: 'auth_required',
		});
	});
}
