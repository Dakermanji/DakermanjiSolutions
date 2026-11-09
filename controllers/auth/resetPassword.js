//! controllers/auth/resetPassword.js

import logger from '../../config/logger.js';
import { verifyToken, tokenTypes } from '../../services/auth/verifyToken.js';
import { resetPassword } from '../../services/auth/resetPassword.js';
import { setLangCookie } from '../../services/i18n/locale.js';

/**
 * Open the reset-password modal when the reset link token is valid.
 *
 * Flow:
 * - reads the raw token and optional lang from the query string
 * - validates the password-reset token without consuming it
 * - syncs the site language with a supported language from the email link
 * - stores the raw token in session for the next POST step
 * - redirects home and opens the reset-password modal
 *
 * Notes:
 * - this controller does not change any user data
 * - this controller does not consume the token
 * - token consumption should happen only after the new password is submitted successfully
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function getResetPassword(req, res) {
	const { token, lang } = req.query;

	try {
		// Reject missing or malformed links early.
		if (!token) {
			req.flash('error', 'auth:error.reset_password_invalid_link');
			return res.redirect('/');
		}

		// Validate the reset token before opening the modal.
		const result = await verifyToken(token, tokenTypes.passwordReset);
		if (!result?.ok) {
			req.flash('error', 'auth:error.reset_password_invalid_link');
			return res.redirect('/');
		}

		// Change the display language only after the reset token is verified.
		setLangCookie(res, lang);

		// Keep the raw token for the password submission step.
		req.session.token = token;

		// Redirect home and open the reset-password modal.
		req.flash('modal', 'reset_password');
		return res.redirect('/');
	} catch (err) {
		logger.error(err.message, {
			type: 'auth',
			controller: 'getResetPassword',
			tokenType: tokenTypes.passwordReset,
		});

		req.flash('error', 'common:error.generic');
		return res.redirect('/');
	}
}

/**
 * Handle reset-password form submission.
 *
 * Intended route:
 * - POST /auth/reset-password
 *
 * Responsibilities:
 * - receive validated reset-password input
 * - delegate password reset to the service layer
 * - clear temporary reset session data after success
 * - redirect with a success flash message
 *
 * Notes:
 * - assumes validateResetPassword already ran
 * - assumes token was normalized by validation middleware
 * - keeps controller thin and free of business logic
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<import('express').Response | void>}
 */
export async function postResetPassword(req, res, next) {
	try {
		const { token, password } = req.body;

		// Reset the password through the service layer.
		await resetPassword({
			token,
			newPassword: password,
			ip: req.ip,
			userAgent: req.get('user-agent'),
		});

		// Clear any temporary reset-password session state after success.
		delete req.session.token;

		// Inform the user that the password was reset successfully.
		req.flash('success', req.t('auth:password_reset.success'));

		return res.redirect('/');
	} catch (err) {
		// Log the failure for debugging and monitoring.
		logger.error('Reset password failed', {
			type: 'auth',
			err: err.message,
			code: err.code,
			ip: req.ip,
		});

		return next(err);
	}
}

export default { getResetPassword, postResetPassword };
