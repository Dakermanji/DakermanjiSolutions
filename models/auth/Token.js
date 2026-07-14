//! models/auth/Token.js

import { query, queryRows } from '../../config/database.js';

/**
 * Create a token.
 *
 * @param {string} userId
 * @param {string} tokenHash
 * @param {Date | string} expiresAt
 * @param {string} type
 * @returns {Promise<{
 *   id: string,
 *   user_id: string,
 *   type: string,
 *   token_hash: string,
 *   expires_at: Date,
 *   used_at: Date | null,
 *   created_at: Date
 * } | null>}
 */
export async function createToken(userId, tokenHash, expiresAt, type) {
	const q = `
		INSERT INTO auth_tokens (user_id, token_hash, type, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, type, token_hash, expires_at, used_at, created_at
	`;

	const rows = await queryRows(q, [userId, tokenHash, type, expiresAt]);
	return rows[0] || null;
}

/**
 * Find a token by its hash.
 *
 * @param {string} tokenHash
 * @param {string} type
 * @returns {Promise<{
 *   id: string,
 *   user_id: string,
 *   token_hash: string,
 *   type: string,
 *   expires_at: Date,
 *   used_at: Date | null,
 *   created_at: Date
 * } | null>}
 */
export async function findTokenByHash(tokenHash, type) {
	const q = `
		SELECT id, user_id, token_hash, type, expires_at, used_at, created_at
		FROM auth_tokens
		WHERE token_hash = $1 AND type = $2
		LIMIT 1
	`;

	const rows = await queryRows(q, [tokenHash, type]);
	return rows[0] || null;
}

/**
 * Mark an auth token as used.
 *
 * Responsibilities:
 * - mark the token as used
 * - update the used_at timestamp
 *
 * Notes:
 * - will not update already-used tokens
 * - safe to call after successful flows
 *
 * @param {string} tokenHash
 * @param {string} type
 * @param {string} userId
 * @returns {Promise<boolean>}
 */

/**
 * Mark an auth token as used.
 *
 * @param {string} tokenHash
 * @param {string} type
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function markTokenUsed(tokenHash, type, userId) {
	const q = `
		UPDATE auth_tokens
		SET used_at = NOW()
		WHERE token_hash = $1
			AND type = $2
			AND used_at IS NULL
			AND user_id = $3
	`;

	const result = await query(q, [tokenHash, type, userId]);
	return result.rowCount > 0;
}

/**
 * Find the latest unused token for a user and type.
 *
 * Notes:
 * - does not check expiry
 * - returns the most recently created unused token
 *
 * @param {string} userId
 * @param {string} type
 * @returns {Promise<{
 *   id: string,
 *   user_id: string,
 *   token_hash: string,
 *   type: string,
 *   expires_at: Date,
 *   used_at: Date | null,
 *   created_at: Date
 * } | null>}
 */
export async function findLatestUnusedByUserIdAndType(userId, type) {
	const q = `
		SELECT id, user_id, token_hash, type, expires_at, used_at, created_at
		FROM auth_tokens
		WHERE user_id = $1
			AND type = $2
			AND used_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`;

	const rows = await queryRows(q, [userId, type]);
	return rows[0] || null;
}

/**
 * Create an auth token record.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.tokenHash
 * @param {Date | string} params.expiresAt
 * @param {string} params.type
 * @returns {Promise<{
 *   id: string,
 *   user_id: string,
 *   token_hash: string,
 *   type: string,
 *   expires_at: Date,
 *   used_at: Date | null,
 *   created_at: Date
 * } | null>}
 */
export async function createAuthTokenRecord({
	userId,
	tokenHash,
	expiresAt,
	type,
}) {
	return createToken(userId, tokenHash, expiresAt, type);
}

/**
 * Update a token record.
 *
 * Supported fields:
 * - tokenHash
 * - expiresAt
 * - usedAt
 *
 * @param {string} id
 * @param {Object} updates
 * @param {string} [updates.tokenHash]
 * @param {Date | string} [updates.expiresAt]
 * @param {Date | string | null} [updates.usedAt]
 * @returns {Promise<{
 *   id: string,
 *   user_id: string,
 *   token_hash: string,
 *   type: string,
 *   expires_at: Date,
 *   used_at: Date | null,
 *   created_at: Date
 * } | null>}
 */
export async function updateAuthTokenRecord(id, updates) {
	const sets = [];
	const values = [];
	let index = 1;

	if (Object.hasOwn(updates, 'tokenHash')) {
		sets.push(`token_hash = $${index++}`);
		values.push(updates.tokenHash);
	}

	if (Object.hasOwn(updates, 'expiresAt')) {
		sets.push(`expires_at = $${index++}`);
		values.push(updates.expiresAt);
	}

	if (Object.hasOwn(updates, 'usedAt')) {
		sets.push(`used_at = $${index++}`);
		values.push(updates.usedAt);
	}

	if (sets.length === 0) {
		return null;
	}

	values.push(id);

	const q = `
		UPDATE auth_tokens
		SET ${sets.join(', ')}
		WHERE id = $${index}
		RETURNING id, user_id, token_hash, type, expires_at, used_at, created_at
	`;

	const rows = await queryRows(q, values);
	return rows[0] || null;
}

export default {
	createToken,
	findLatestUnusedByUserIdAndType,
	createAuthTokenRecord,
	updateAuthTokenRecord,
	findTokenByHash,
	markTokenUsed,
};
