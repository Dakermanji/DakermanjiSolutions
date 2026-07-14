//! config/passport/strategies/localSecurity.js

import AuthSecurityModel from '../../../models/auth/Security.js';
import AuthSecurityEventModel from '../../../models/auth/SecurityEvent.js';
import UserModel from '../../../models/User.js';

/**
 * Local sign-in security helpers.
 *
 * Keeps Passport strategy readable.
 * DB-backed logic can later move into models.
 */

/**
 * Log an auth security event.
 *
 * Inserts a record into auth_security_events.
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null,
 *   eventType: string,
 *   ipAddress?: string | null,
 *   userAgent?: string | null
 * }} params
 * @returns {Promise<void>}
 */
async function logAuthEvent({
	userId = null,
	identifier = null,
	eventType,
	ipAddress = null,
	userAgent = null,
}) {
	await AuthSecurityEventModel.insertAuthEvent({
		userId,
		identifier,
		eventType,
		ipAddress,
		userAgent,
	});
}

/**
 * Get auth security state for a sign-in attempt.
 *
 * Current behavior:
 * - loads auth_security row by userId or identifier
 * - returns null if no state exists yet
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null
 * }} params
 * @returns {Promise<{
 *   failed_signin_count?: number,
 *   locked_until?: Date | string | null,
 *   force_password_reset?: boolean
 * } | null>}
 */
async function getAuthSecurityState({ userId = null, identifier = null }) {
	return await AuthSecurityModel.findByUserIdOrIdentifier({
		userId,
		identifier,
	});
}

/**
 * Update auth security state after sign-in attempt.
 *
 * Current behavior:
 * - ensures an auth_security row exists
 * - on failure: records failed sign-in metadata
 * - on success: records successful sign-in metadata
 *
 * @param {{
 *   successful: boolean,
 *   userId?: string | null,
 *   identifier?: string | null
 * }} params
 * @returns {Promise<void>}
 */
async function updateSigninState({
	successful,
	userId = null,
	identifier = null,
}) {
	await AuthSecurityModel.createIfMissing({
		userId,
		identifier,
	});

	if (successful) {
		await AuthSecurityModel.recordSuccessfulSignin(userId);
		await UserModel.updateLastSignIn(userId);

		return;
	}

	await AuthSecurityModel.recordFailedSignin({
		userId,
		identifier,
	});
}

/**
 * Check whether auth security state is locked.
 *
 * @param {{ locked_until?: Date | string | null } | null} authSecurity
 * @returns {boolean}
 */
function isLocked(authSecurity) {
	if (!authSecurity?.locked_until) {
		return false;
	}

	return new Date(authSecurity.locked_until).getTime() > Date.now();
}

/**
 * Decide whether a sign-in state should be locked.
 *
 * Current policy:
 * - lock after 5 failed sign-in attempts
 * - lock duration is 15 minutes
 *
 * Notes:
 * - pure helper, no DB writes
 * - returns lock info so caller can decide what to persist
 *
 * @param {{
 *   failed_signin_count?: number,
 *   locked_until?: Date | string | null
 * } | null} authSecurity
 * @returns {{
 *   shouldLock: boolean,
 *   lockedUntil: Date | null
 * }}
 */
function getLockDecision(authSecurity) {
	const failedSigninCount = authSecurity?.failed_signin_count ?? 0;
	const isAlreadyLocked = isLocked(authSecurity);

	if (isAlreadyLocked) {
		return {
			shouldLock: false,
			lockedUntil: null,
		};
	}

	if (failedSigninCount < 5) {
		return {
			shouldLock: false,
			lockedUntil: null,
		};
	}

	const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);

	return {
		shouldLock: true,
		lockedUntil,
	};
}

/**
 * Apply account lock if the current security state requires it.
 *
 * Responsibilities:
 * - load current auth security state
 * - evaluate lock policy using getLockDecision
 * - persist lock if needed
 *
 * Behavior:
 * - does nothing if lock conditions are not met
 * - sets locked_until when threshold is reached
 *
 * Notes:
 * - userId is preferred when available
 * - identifier is used for pre-user or fallback cases
 * - lock policy is defined in getLockDecision()
 * - persistence is handled by AuthSecurityModel
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null
 * }} params
 * @returns {Promise<boolean>}
 * - true  → lock was applied
 * - false → no lock needed
 */
async function lockSigninIfNeeded({ userId = null, identifier = null }) {
	// Load current security state (may be null if not created yet)
	const authSecurity = await getAuthSecurityState({
		userId,
		identifier,
	});

	// Determine whether a lock should be applied
	const lockDecision = getLockDecision(authSecurity);

	// No lock needed → exit early
	if (!lockDecision.shouldLock) {
		return false;
	}

	// Persist lock in database
	await AuthSecurityModel.setLockedUntil({
		userId,
		identifier,
		lockedUntil: lockDecision.lockedUntil,
	});

	return true;
}

export {
	logAuthEvent,
	getAuthSecurityState,
	updateSigninState,
	isLocked,
	getLockDecision,
	lockSigninIfNeeded,
};
