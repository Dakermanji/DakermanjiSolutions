//! middlewares/validators/auth/credentials.js

import {
	isSafeString,
	isValidPassword,
	parseIdentifier,
} from '../common.js';
import { isValidToken, normalizeToken } from '../token.js';
import { fail } from '../../../services/http/response.js';
import {
	AUTH_ERROR_PREFIX,
	MAX_PASSWORD_LENGTH,
} from '../../../constants/auth/validation.js';
import { MAX_IDENTIFIER_LENGTH } from '../../../constants/common.js';

/**
 * Validated a sign-in request using either email or username.
 *
 * It normalized the identifier and stored its resolved type on the request.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {void}
 */
export function validateSignIn(req, res, next) {
	const identifierRaw = req.body?.identifier;
	const passwordRaw = req.body?.password;
	const key = `${AUTH_ERROR_PREFIX}invalid_credentials`;
	const failSignin = () => {
		if (typeof identifierRaw === 'string') {
			req.flash('signinIdentifier', identifierRaw.trim().slice(0, MAX_IDENTIFIER_LENGTH));
		}
		return fail(req, res, key, { modal: 'signin' });
	};

	if (!isSafeString(passwordRaw, MAX_PASSWORD_LENGTH))
		return failSignin();

	const parsedIdentifier = parseIdentifier(identifierRaw);

	if (!parsedIdentifier) return failSignin();

	req.body.identifier = parsedIdentifier.identifier;
	req.body.identifierType = parsedIdentifier.identifierType;
	req.body.password = passwordRaw;
	next();
}

/**
 * Validated a password reset form submission.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {void}
 */
export function validateResetPassword(req, res, next) {
	const modal = 'reset_password';
	const { token, password, confirmPassword } = req.body;
	const normalizedToken = normalizeToken(token);

	if (!isValidToken(normalizedToken))
		return fail(req, res, `${AUTH_ERROR_PREFIX}reset_password_invalid_link`, {
			modal,
		});

	if (!password || !isValidPassword(password))
		return fail(req, res, `${AUTH_ERROR_PREFIX}password_weak`, {
			modal,
		});

	if (password !== confirmPassword)
		return fail(req, res, `${AUTH_ERROR_PREFIX}password_mismatch`, {
			modal,
		});

	req.body.token = normalizedToken;
	next();
}
