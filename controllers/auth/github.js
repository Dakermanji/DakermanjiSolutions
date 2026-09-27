//! controllers/auth/github.js

import passport from 'passport';
import { appReturnTo } from '../../services/auth/returnTo.js';

import { handleOAuthCallback } from '../../services/auth/oauth.js';

/**
 * Start GitHub OAuth flow.
 *
 * Responsibilities:
 * - redirect the user to GitHub
 * - use one shared entry for signup and signin
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function githubCall(req, res, next) {
	if (!req.isAuthenticated?.()) req.session.oauthReturnTo = appReturnTo(req.query.returnTo);
	req.session.oauthLocale = req.language || req.resolvedLanguage || 'en';

	if (req.isAuthenticated?.() && req.query?.returnTo === 'profile') {
		req.session.oauthReturnTo = '/profile';
		req.session.oauthIntent = 'link';
	}

	passport.authenticate('github', {
		scope: ['user:email'],
	})(req, res, next);
}

/**
 * Handle GitHub OAuth callback.
 *
 * Responsibilities:
 * - complete Passport authentication for GitHub OAuth
 * - delegate shared OAuth logic to handleOAuthCallback
 * - keep controller minimal and provider-specific only
 *
 * Flow:
 * - Passport authenticates the request
 * - result (err, user) is passed to shared handler
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void}
 */
export function githubCallback(req, res, next) {
	passport.authenticate('github', (err, user) =>
		handleOAuthCallback(req, res, next, err, user),
	)(req, res, next);
}
