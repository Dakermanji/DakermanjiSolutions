//! services/auth/tokens.js

import crypto from 'node:crypto';

import AuthTokenModel from '../../models/auth/Token.js';

export const AUTH_EXPIRY_TIME = 1000 * 60 * 60 * 6; // unit is ms, result is 6 hours
export const ACCOUNT_DELETION_EXPIRY_TIME = 1000 * 60 * 15; // 15 minutes

/**
 * Create a secure random token for auth flows.
 *
 * Returned value is the raw token that can be sent to the user.
 *
 * @param {number} size
 * @returns {string}
 */
export function createAuthToken(size = 32) {
	return crypto.randomBytes(size).toString('hex');
}

/**
 * Hash an auth token before storing it in the database.
 *
 * @param {string} token
 * @returns {string}
 */
export function hashAuthToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Prepare a recovery token for a given user and type.
 *
 * Behavior:
 * - reuses existing unused token row (by updating it)
 * - always rotates token value (since only hashes are stored)
 * - creates new record if none exists
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {'password_reset'|'signup_verification'|'account_deletion'} params.type
 * @param {number} [params.expiresIn]
 * @returns {Promise<{
 *   token: string,
 *   record: object,
 *   action: 'created' | 'rotated'
 * }>}
 */
export async function prepareRecoveryToken({
	userId,
	type,
	expiresIn = AUTH_EXPIRY_TIME,
}) {
	const existing = await AuthTokenModel.findLatestUnusedByUserIdAndType(
		userId,
		type,
	);

	const token = createAuthToken();
	const tokenHash = hashAuthToken(token);
	const expiresAt = new Date(Date.now() + expiresIn);

	// If an unused token exists → rotate it
	if (existing) {
		const record = await AuthTokenModel.updateAuthTokenRecord(existing.id, {
			tokenHash,
			expiresAt,
			usedAt: null,
		});

		return {
			token,
			record,
			action: 'rotated',
		};
	}

	// Otherwise → create new token
	const record = await AuthTokenModel.createAuthTokenRecord({
		userId,
		tokenHash,
		expiresAt,
		type,
	});

	return {
		token,
		record,
		action: 'created',
	};
}

export default {
	createAuthToken,
	hashAuthToken,
	AUTH_EXPIRY_TIME,
	ACCOUNT_DELETION_EXPIRY_TIME,
};
