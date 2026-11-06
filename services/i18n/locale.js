//! services/i18n/locale.js

import { SUPPORTED_LANGUAGE_SET } from '../../config/languages.js';

function getSupportedLocale(lang) {
	if (!lang || !SUPPORTED_LANGUAGE_SET.has(lang)) {
		return null;
	}

	return lang;
}

/**
 * Set language cookie if valid.
 *
 * Responsibilities:
 * - validate locale against supported languages
 * - centralize cookie configuration
 * - avoid repetition across controllers
 *
 * @param {import('express').Response} res
 * @param {string | null | undefined} lang
 */
export function setLangCookie(res, lang) {
	const locale = getSupportedLocale(lang);

	if (!locale) {
		return;
	}

	res.cookie('lang', locale, {
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 1000 * 60 * 60 * 24 * 30,
	});
}

/**
 * Resolve the current request locale.
 *
 * Responsibilities:
 * - prioritize signed-in user preference when present
 * - prioritize OAuth session locale before login completes
 * - fallback to i18next-detected language
 * - ensure a valid default when no language is resolved
 *
 * Priority order:
 * 1. req.user.locale (database preference)
 * 2. req.session.oauthLocale (captured before OAuth redirect)
 * 3. req.language (primary i18next detected language)
 * 4. req.resolvedLanguage (fallback from i18next)
 * 5. 'en' (application default)
 *
 * @param {import('express').Request} req - Express request object
 * @returns {string} Resolved locale code (e.g. 'en', 'fr', 'ar')
 */
export function getLocale(req) {
	return (
		getSupportedLocale(req.publicLocale) ||
		getSupportedLocale(req.user?.locale) ||
		getSupportedLocale(req.session?.oauthLocale) ||
		getSupportedLocale(req.language) ||
		getSupportedLocale(req.resolvedLanguage) ||
		'en'
	);
}
