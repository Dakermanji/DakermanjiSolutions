//! controllers/auth/signinLocal.js

import passport from 'passport';
import { appReturnTo } from '../../services/auth/returnTo.js';

import { SUPPORTED_LANGUAGE_SET } from '../../config/languages.js';
import { setLangCookie } from '../../services/i18n/locale.js';

/**
 * Handle failed local sign-in response.
 *
 * Responsibilities:
 * - flash auth error message
 * - reopen login modal
 * - redirect back home
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ message?: string } | undefined} info
 * @returns {void}
 */
function handleSigninFailure(req, res, info) {
	req.flash('error', info?.message || 'auth:error.invalid_credentials');
	req.flash('modal', 'signin');

	res.redirect('/');
}

/**
 * Handle successful local sign-in response.
 *
 * Responsibilities:
 * - establish login session
 * - redirect after success
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {{ id: string, email: string, username: string }} user
 * @returns {void}
 */
function handleSigninSuccess(req, res, next, user) {
	const destination = appReturnTo(req.session.appReturnTo);
	req.logIn(user, (loginErr) => {
		if (loginErr) {
			return next(loginErr);
		}

		setLangCookie(res, user?.locale);

		return res.redirect(destination);
	});
}

/**
 * Handle local sign-in.
 *
 * Expected input:
 * - req.body.identifier
 * - req.body.identifierType
 * - req.body.password
 *
 * Notes:
 * - actual credential verification is handled by Passport local strategy
 * - this controller is responsible for session login flow and redirects
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function signinLocal(req, res, next) {
	req.session.appReturnTo = appReturnTo(req.body.returnTo);
	passport.authenticate('local', (err, user, info) => {
		if (err) {
			return next(err);
		}

		if (!user) {
			return handleSigninFailure(req, res, info);
		}

		return handleSigninSuccess(req, res, next, user);
	})(req, res, next);
}
