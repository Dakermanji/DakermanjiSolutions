//! controllers/auth/discord.js

import passport from 'passport';
import { appReturnTo } from '../../services/auth/returnTo.js';

import { handleOAuthCallback } from '../../services/auth/oauth.js';

/**
 * Start Discord OAuth flow.
 *
 * Responsibilities:
 * - redirect the user to Discord
 * - use one shared entry for signup and signin
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function discordCall(req, res, next) {
	if (!req.isAuthenticated?.()) req.session.oauthReturnTo = appReturnTo(req.query.returnTo);
	req.session.oauthLocale = req.language || req.resolvedLanguage || 'en';

	if (req.isAuthenticated?.() && req.query?.returnTo === 'profile') {
		req.session.oauthReturnTo = '/profile';
		req.session.oauthIntent = 'link';
	}

	passport.authenticate('discord', {
		scope: ['identify', 'email'],
	})(req, res, next);
}

/**
 * Handle Discord OAuth callback.
 *
 * Responsibilities:
 * - complete Passport authentication for Discord OAuth
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
export function discordCallback(req, res, next) {
	passport.authenticate('discord', (err, user) =>
		handleOAuthCallback(req, res, next, err, user),
	)(req, res, next);
}
