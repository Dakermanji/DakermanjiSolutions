//! middlewares/validators/common.js

import validator from 'validator';
import {
	MAX_IDENTIFIER_LENGTH,
	PASSWORD_REGEX,
	USERNAME_REGEX,
} from '../../constants/common.js';

/** Normalize email (trim + lowercase) */
export const normalizeEmail = (email) =>
	String(email ?? '')
		.trim()
		.toLowerCase();

/** Normalize text (trim, optional lowercase) */
export const normalizeText = (value, { lower = false } = {}) => {
	let result = String(value ?? '').trim();
	if (lower) result = result.toLowerCase();
	return result;
};

/** Basic email validation using validator */
export const isValidEmail = (email) => validator.isEmail(normalizeEmail(email));

export const isValidUsername = (username) => {
	const normalizedUsername = normalizeText(username);
	return USERNAME_REGEX.test(normalizedUsername);
};

/** Check email length safety (<= 254 chars) */
export const isSafeEmail = (email) => {
	const normalizedEmail = normalizeEmail(email);
	return normalizedEmail.length > 0 && normalizedEmail.length <= MAX_IDENTIFIER_LENGTH;
};

export const isValidPassword = (password) =>
	PASSWORD_REGEX.test(String(password ?? ''));

export const isValidUuid = (value) =>
	validator.isUUID(String(value ?? ''), 4);

export function isValidDateOnly(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Non-empty string */
export const isNonEmptyString = (value) =>
	typeof value === 'string' && value.trim().length > 0;

/** string length less than max */
export const isWithinLength = (value, max) =>
	typeof value === 'string' && value.length <= max;

/** Non-empty string with length less than max */
export const isSafeString = (value, max) =>
	isNonEmptyString(value) && isWithinLength(value, max);

/** Validate language code (2-letter ISO) */
export const isValidLang = (lang) => /^[a-z]{2}$/.test(lang);

/**
 * Sanitize a redirect path and keep it internal-only.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const sanitizeReturnTo = (value) => {
	if (typeof value !== 'string') return '/';

	const normalizedValue = value.trim();

	if (!normalizedValue.startsWith('/') || normalizedValue.startsWith('//'))
		return '/';

	if (normalizedValue.includes('://')) return '/';

	return normalizedValue;
};

/**
 * Parse an identifier as either email or username.
 *
 * @param {unknown} value
 * @param {{ allowLegacyUsername?: boolean }} [options]
 * @returns {{ identifier: string, identifierType: 'email' | 'username' } | null}
 */
export const parseIdentifier = (value, { allowLegacyUsername = false } = {}) => {
	if (!isSafeString(value, MAX_IDENTIFIER_LENGTH)) return null;

	const email = normalizeEmail(value);

	if (isValidEmail(email) && isSafeEmail(email)) {
		return {
			identifier: email,
			identifierType: 'email',
		};
	}

	const username = normalizeText(value);

	if (isValidUsername(username) ||
		(allowLegacyUsername && /^[a-zA-Z0-9_.-]{3,20}$/.test(username))) {
		return {
			identifier: normalizeText(username, { lower: true }),
			identifierType: 'username',
		};
	}

	return null;
};
