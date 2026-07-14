//! services/auth/signupSecurity.js

import SignupSecurityModel from '../../models/auth/SignupSecurity.js';

/**
 * Signup security helpers.
 *
 * Responsibilities:
 * - evaluate signup abuse/cooldown rules
 * - keep controller readable
 */

const EMAIL_COOLDOWN_MS = 10 * 60 * 1000;
const IP_LOCK_THRESHOLD = 5;
const IP_LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * Check whether signup state is currently locked.
 *
 * @param {{ locked_until?: Date | string | null } | null} signupSecurity
 * @returns {boolean}
 */
function isLocked(signupSecurity) {
	if (!signupSecurity?.locked_until) {
		return false;
	}

	return new Date(signupSecurity.locked_until).getTime() > Date.now();
}

/**
 * Check whether sending another signup email should be blocked by cooldown.
 *
 * @param {{ last_attempt_at?: Date | string | null } | null} signupSecurity
 * @returns {boolean}
 */
function isEmailCooldownActive(signupSecurity) {
	if (!signupSecurity?.last_attempt_at) {
		return false;
	}

	const lastAttemptAt = new Date(signupSecurity.last_attempt_at).getTime();
	return Date.now() - lastAttemptAt < EMAIL_COOLDOWN_MS;
}

/**
 * Apply IP lock policy if needed.
 *
 * @param {{ ipAddress: string, email?: string | null }} params
 * @returns {Promise<boolean>}
 */
async function lockIpIfNeeded({ ipAddress, email = null }) {
	const ipSecurity = await SignupSecurityModel.findLatestByIp(ipAddress);

	const attemptCount = ipSecurity?.attempt_count ?? 0;
	if (attemptCount < IP_LOCK_THRESHOLD) {
		return false;
	}

	const lockedUntil = new Date(Date.now() + IP_LOCK_DURATION_MS);

	await SignupSecurityModel.setLockedUntil({
		ipAddress,
		email,
		lockedUntil,
	});

	return true;
}

export { isLocked, isEmailCooldownActive, lockIpIfNeeded };
