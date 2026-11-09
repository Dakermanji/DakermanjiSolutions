//! middlewares/validators/auth/signup.js

import { isValidPassword, isValidUsername, normalizeText } from '../common.js';
import { isValidToken, normalizeToken } from '../token.js';
import { validateNoProfanity } from '../../profanity/index.js';
import { fail } from '../../../services/http/response.js';
import { rememberSignupForm } from '../../../services/auth/signupFormState.js';
import { AUTH_ERROR_PREFIX } from '../../../constants/auth/validation.js';
import {
	acceptedLegalDocuments,
	normalizeOptionalAvatarSeed,
	normalizeOptionalCountryCode,
	validateProfileFields,
} from './fields.js';

/**
 * Validated the final step of local signup.
 *
 * It collected validation errors instead of failing immediately so the
 * caller could display all relevant feedback at once.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware.
 * @returns {void}
 */
export function validateCompleteLocalSignup(req, res, next) {
	const { token, username, password, confirmPassword } = req.body;
	const errors = [];

	const normalizedToken = normalizeToken(token);
	const normalizedUsername = normalizeText(username);
	const avatarSeed = normalizeOptionalAvatarSeed(req.body?.avatarSeed);
	const countryCode = normalizeOptionalCountryCode(req.body?.countryCode);

	if (!isValidToken(token))
		errors.push(`${AUTH_ERROR_PREFIX}verify_email_invalid_link`);

	if (!isValidUsername(normalizedUsername))
		errors.push(`${AUTH_ERROR_PREFIX}username_invalid`);

	if (!validateNoProfanity(normalizedUsername))
		errors.push(`${AUTH_ERROR_PREFIX}username_profanity`);

	if (!isValidPassword(password)) errors.push(`${AUTH_ERROR_PREFIX}password_weak`);

	if (password !== confirmPassword)
		errors.push(`${AUTH_ERROR_PREFIX}password_mismatch`);

	if (!acceptedLegalDocuments(req.body?.legalAcceptance))
		errors.push(`${AUTH_ERROR_PREFIX}legal_acceptance_required`);

	validateProfileFields({
		avatarSeed,
		countryCode,
		errors,
	});

	req.body.token = normalizedToken;
	req.body.username = normalizedUsername;
	req.body.avatarSeed = avatarSeed;
	req.body.countryCode = countryCode;
	req.validationErrors = errors;
	next();
}

export function validateSetUsername(req, res, next) {
	const user = req.user;
	const username = normalizeText(req.body?.username);
	const avatarSeed = normalizeOptionalAvatarSeed(req.body?.avatarSeed);
	const countryCode = normalizeOptionalCountryCode(req.body?.countryCode);
	const errors = [];

	if (!user) return fail(req, res, `${AUTH_ERROR_PREFIX}auth_required`);

	if (user.username) return res.redirect('/');

	if (!isValidUsername(username))
		errors.push(`${AUTH_ERROR_PREFIX}username_invalid`);

	if (!validateNoProfanity(username))
		errors.push(`${AUTH_ERROR_PREFIX}username_profanity`);

	if (!acceptedLegalDocuments(req.body?.legalAcceptance))
		errors.push(`${AUTH_ERROR_PREFIX}legal_acceptance_required`);

	validateProfileFields({
		avatarSeed,
		countryCode,
		errors,
	});

	if (errors.length > 0) {
		rememberSignupForm(req);
		req.flash('errors', errors);
		req.flash('modal', 'complete_signup_oauth');
		return res.redirect('/');
	}

	req.body.username = username;
	req.body.avatarSeed = avatarSeed;
	req.body.countryCode = countryCode;
	next();
}
