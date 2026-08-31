//! middlewares/profanity/index.js

/**
 * Profanity validation helpers
 * ----------------------------
 * Reusable profanity detection helpers for usernames and future user content.
 */

import { Profanity } from '@2toad/profanity';
import { CUSTOM_PROFANITY_WORDS, PROFANITY_WHITELIST } from './customWords.js';

const profanity = new Profanity({
	languages: ['en', 'fr'],
	wholeWord: true,
	unicodeWordBoundaries: true,
});

if (CUSTOM_PROFANITY_WORDS.length > 0) {
	profanity.addWords(CUSTOM_PROFANITY_WORDS);
}

if (PROFANITY_WHITELIST.length > 0) {
	profanity.whitelist.addWords(PROFANITY_WHITELIST);
}

/**
 * Normalize text for profanity checks.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeProfanityText(value) {
	return String(value ?? '')
		.normalize('NFKC')
		.trim()
		.toLowerCase();
}

/**
 * Collapse separators and symbols so split profanity like:
 * - f u c k
 * - f.u.c.k
 * - f_u-c k
 * can still be detected.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function collapseProfanityText(value) {
	return normalizeProfanityText(value).replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Inspect text for profanity in both normal and collapsed forms.
 *
 * @param {unknown} value
 * @returns {{ contains: boolean, normalized: boolean, collapsed: boolean }}
 */
export function inspectProfanity(value) {
	const normalizedValue = normalizeProfanityText(value);

	if (!normalizedValue) {
		return {
			contains: false,
			normalized: false,
			collapsed: false,
		};
	}

	const normalized = profanity.exists(normalizedValue);
	const collapsedValue = collapseProfanityText(normalizedValue);
	const collapsed = Boolean(
		collapsedValue &&
		collapsedValue !== normalizedValue &&
		profanity.exists(collapsedValue),
	);

	return {
		contains: normalized || collapsed,
		normalized,
		collapsed,
	};
}

/**
 * Check whether text contains profanity.
 *
 * Strategy:
 * - check the normalized original text
 * - also check a collapsed form to catch split/obfuscated words
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function containsProfanity(value) {
	return inspectProfanity(value).contains;
}

/**
 * Validate that text does not contain profanity.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function validateNoProfanity(value) {
	return !containsProfanity(value);
}
