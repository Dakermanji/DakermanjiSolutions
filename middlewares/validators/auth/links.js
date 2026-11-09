//! middlewares/validators/auth/links.js

import { isValidLang, normalizeText } from '../common.js';
import { isValidToken, normalizeToken } from '../token.js';
import { SUPPORTED_LANGUAGE_SET } from '../../../config/languages.js';
import { AUTH_ERROR_PREFIX } from '../../../constants/auth/validation.js';

/**
 * Created a query validator for token-based auth links.
 *
 * It validates the token and normalizes the optional language code.
 * Reset links can ignore an invalid language without rejecting a valid token.
 *
 * @param {string} errorKey - Flash key used when the link was invalid.
 * @param {{ ignoreInvalidLang?: boolean }} options
 * @returns {import('express').RequestHandler}
 */
export const validateTokenAndLangQuery = (
	errorKey,
	{ ignoreInvalidLang = false } = {},
) => {
	return function (req, res, next) {
		const { token, lang } = req.query;

		const normalizedToken = normalizeToken(token);
		const normalizedLang = normalizeText(lang, { lower: true });

		if (
			!isValidToken(token) ||
			(!ignoreInvalidLang && lang && !isValidLang(normalizedLang))
		) {
			req.flash('error', errorKey);
			return res.redirect('/');
		}

		req.query.token = normalizedToken;
		req.query.lang =
			ignoreInvalidLang && !SUPPORTED_LANGUAGE_SET.has(normalizedLang)
				? ''
				: normalizedLang;

		next();
	};
};

export const validateVerifyEmailQuery = validateTokenAndLangQuery(
	`${AUTH_ERROR_PREFIX}verify_email_invalid_link`,
);

export const validateResetPasswordQuery = validateTokenAndLangQuery(
	`${AUTH_ERROR_PREFIX}reset_password_invalid_link`,
	{ ignoreInvalidLang: true },
);
