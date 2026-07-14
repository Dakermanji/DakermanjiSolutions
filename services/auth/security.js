//! services/auth/security.js

import AuthSecurityEventModel from '../../models/auth/SecurityEvent.js';

export const RECOVERY_RATE_LIMIT_RULES = [
	{ windowMs: 1000 * 60 * 5, max: 3 },
	{ windowMs: 1000 * 60 * 60, max: 10 },
	{ windowMs: 1000 * 60 * 60 * 24, max: 20 },
];

/**
 * Check whether an auth event is rate limited for the given value.
 *
 * @param {Object} params
 * @param {string} params.eventType
 * @param {'ip' | 'identifier'} params.field
 * @param {string | null | undefined} params.value
 * @param {{ windowMs: number, max: number }[]} params.rules
 * @returns {Promise<boolean>}
 */
export async function isRateLimitedByField({ eventType, field, value, rules }) {
	if (!value) {
		return false;
	}

	for (const rule of rules) {
		const since = new Date(Date.now() - rule.windowMs);
		const count = await AuthSecurityEventModel.countRecentByField({
			eventType,
			field,
			value,
			since,
		});

		if (count >= rule.max) {
			return true;
		}
	}

	return false;
}

/**
 * Check whether a recovery request is rate limited by IP or identifier.
 *
 * Returns true if either limit is exceeded.
 *
 * @param {Object} params
 * @param {string | null | undefined} params.ipAddress
 * @param {string | null | undefined} params.identifier
 * @returns {Promise<boolean>}
 */
export async function isRecoveryRateLimited({ ipAddress, identifier }) {
	const eventType = 'recovery_request';

	const [ipLimited, identifierLimited] = await Promise.all([
		isRateLimitedByField({
			eventType,
			field: 'ip',
			value: ipAddress,
			rules: RECOVERY_RATE_LIMIT_RULES,
		}),
		isRateLimitedByField({
			eventType,
			field: 'identifier',
			value: identifier,
			rules: RECOVERY_RATE_LIMIT_RULES,
		}),
	]);

	return ipLimited || identifierLimited;
}

export default {
	RECOVERY_RATE_LIMIT_RULES,
	isRateLimitedByField,
	isRecoveryRateLimited,
};
