//! middlewares/validators/auth/email.js

import { isSafeEmail, isValidEmail, normalizeEmail } from '../common.js';
import { fail } from '../../../services/http/response.js';
import { AUTH_ERROR_PREFIX } from '../../../constants/auth/validation.js';
import { MAX_IDENTIFIER_LENGTH } from '../../../constants/common.js';

/**
 * Validated and normalized an email field from the request body.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @param {{ modal: string }} options - Modal name used in the failure response.
 * @returns {void}
 */
export function validateEmailField(req, res, next, { modal }) {
	const email = normalizeEmail(req.body?.email);

	if (!isValidEmail(email) || !isSafeEmail(email)) {
		if (modal === 'signup' && typeof req.body?.email === 'string') {
			req.flash('signupEmail', email.slice(0, MAX_IDENTIFIER_LENGTH));
		}
		return fail(req, res, `${AUTH_ERROR_PREFIX}email_invalid`, { modal });
	}

	req.body.email = email;
	next();
}

export const validateSignupEmail = (req, res, next) =>
	validateEmailField(req, res, next, { modal: 'signup' });

export const validateRecoveryEmail = (req, res, next) =>
	validateEmailField(req, res, next, { modal: 'recovery' });

/**
 * Validated the recovery action selected by the user.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {void}
 */
export function validateRecoveryIntent(req, res, next) {
	const intent = req.body?.intent;

	if (intent !== 'password_reset' && intent !== 'resend_verification')
		return fail(req, res, `common:error.invalid_request`, {
			modal: 'recovery',
		});

	next();
}
