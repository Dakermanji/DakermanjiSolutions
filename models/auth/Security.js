//! models/auth/Security.js

import { query, queryRows } from '../../config/database.js';

/**
 * Auth Security Model
 * -------------------
 * Handles auth_security table operations.
 *
 * Notes:
 * - userId is preferred when available
 * - identifier is used for pre-user or fallback auth attempts
 * - this model stores mutable auth security state
 */

/**
 * Find auth security row by user id or identifier.
 *
 * Lookup priority:
 * - userId first
 * - identifier second
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null
 * }} params
 * @returns {Promise<{
 *   id: string,
 *   user_id: string | null,
 *   identifier: string | null,
 *   last_signin_at: Date | null,
 *   last_failed_signin_at: Date | null,
 *   failed_signin_count: number,
 *   locked_until: Date | null,
 *   force_password_reset: boolean,
 *   created_at: Date,
 *   updated_at: Date
 * } | null>}
 */
async function findByUserIdOrIdentifier({ userId = null, identifier = null }) {
	const value = userId ?? identifier;
	const column = userId ? 'user_id' : identifier ? 'identifier' : null;

	if (!column) return null;

	const q = `
	SELECT
		id,
		user_id,
		identifier,
		last_signin_at,
		last_failed_signin_at,
		failed_signin_count,
		locked_until,
		force_password_reset,
		created_at,
		updated_at
	FROM auth_security
	WHERE ${column} = $1
	LIMIT 1;
`;

	const rows = await queryRows(q, [value]);
	return rows[0] ?? null;
}

/**
 * Create an auth security row if none exists.
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null
 * }} params
 * @returns {Promise<void>}
 */
async function createIfMissing({ userId = null, identifier = null }) {
	if (!userId && !identifier) {
		return;
	}

	const existingRow = await findByUserIdOrIdentifier({
		userId,
		identifier,
	});

	if (existingRow) {
		return;
	}

	const q = `
		INSERT INTO auth_security (
			user_id,
			identifier
		)
		VALUES ($1, $2);
	`;

	await query(q, [userId, identifier]);
}

/**
 * Record a failed sign-in attempt.
 *
 * Behavior:
 * - increments failed_signin_count
 * - updates last_failed_signin_at
 * - updates updated_at
 *
 * Notes:
 * - ensures the auth_security row exists first
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null
 * }} params
 * @returns {Promise<void>}
 */
async function recordFailedSignin({ userId = null, identifier = null }) {
	await createIfMissing({ userId, identifier });

	const value = userId ?? identifier;
	const column = userId ? 'user_id' : identifier ? 'identifier' : null;

	if (!column) return;

	const q = `
		UPDATE auth_security
		SET
			failed_signin_count = failed_signin_count + 1,
			last_failed_signin_at = NOW(),
			updated_at = NOW()
		WHERE ${column} = $1;
	`;

	await query(q, [value]);
}

/**
 * Record a successful sign-in.
 *
 * Behavior:
 * - updates last_signin_at
 * - resets failed_signin_count
 * - clears locked_until
 * - updates updated_at
 *
 * Notes:
 * - ensures the auth_security row exists first
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function recordSuccessfulSignin(userId) {
	await createIfMissing({ userId });

	const q = `
		UPDATE auth_security
		SET
			last_signin_at = NOW(),
			failed_signin_count = 0,
			locked_until = NULL,
			updated_at = NOW()
		WHERE user_id = $1;
	`;

	await query(q, [userId]);
}

/**
 * Set locked_until for an auth security row.
 *
 * Behavior:
 * - updates locked_until
 * - updates updated_at
 *
 * Notes:
 * - ensures the auth_security row exists first
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null,
 *   lockedUntil: Date
 * }} params
 * @returns {Promise<void>}
 */
async function setLockedUntil({
	userId = null,
	identifier = null,
	lockedUntil,
}) {
	await createIfMissing({ userId, identifier });

	const value = userId ?? identifier;
	const column = userId ? 'user_id' : identifier ? 'identifier' : null;

	if (!column) return;

	const q = `
		UPDATE auth_security
		SET
			locked_until = $2,
			updated_at = NOW()
		WHERE ${column} = $1;
	`;

	await query(q, [value, lockedUntil]);
}

export default {
	findByUserIdOrIdentifier,
	createIfMissing,
	recordFailedSignin,
	recordSuccessfulSignin,
	setLockedUntil,
};
