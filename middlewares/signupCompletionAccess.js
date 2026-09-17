//! middlewares/signupCompletionAccess.js

/**
 * Signup Completion Access Middleware
 *
 * Keeps incomplete authenticated users focused on finishing signup before
 * they can access the rest of the application.
 */

const ALLOWED_EXACT_ROUTES = new Set(['/']);

const ALLOWED_PREFIXES = [
	'/auth/complete-local-signup',
	'/auth/set-username',
	'/auth/signout',
	'/avatar',
	'/legal',
	'/language',
	'/theme',
];

const ASSET_PATH_PATTERN = /\.[a-z0-9]+$/i;
const COMPLETE_SIGNUP_MODAL = 'complete_signup_oauth';

function normalizePath(path = '/') {
	if (path.length > 1) {
		return path.replace(/\/+$/, '');
	}

	return path;
}

function isAllowedRoute(path) {
	if (ALLOWED_EXACT_ROUTES.has(path)) {
		return true;
	}

	return ALLOWED_PREFIXES.some(
		(prefix) => path === prefix || path.startsWith(`${prefix}/`),
	);
}

function acceptsHtml(req) {
	return req.accepts(['html', 'json']) === 'html';
}

function needsSignupCompletion(req) {
	const isAuthenticated = req.isAuthenticated?.() ?? false;

	return isAuthenticated && !req.user?.username;
}

export default function signupCompletionAccess(app) {
	app.use((req, res, next) => {
		if (!needsSignupCompletion(req)) {
			return next();
		}

		const path = normalizePath(req.path);

		if (path === '/') {
			res.locals.modal = COMPLETE_SIGNUP_MODAL;
			return next();
		}

		if (isAllowedRoute(path) || ASSET_PATH_PATTERN.test(path)) {
			return next();
		}

		if (acceptsHtml(req)) {
			req.flash('modal', COMPLETE_SIGNUP_MODAL);
			return res.redirect('/');
		}

		return res.status(403).json({
			error: 'signup_completion_required',
		});
	});
}
