//! models/social/Blocks.js

import { query, queryRows } from '../../config/database.js';

const BASE_FIELDS = ['id', 'blocker_id', 'blocked_id', 'created_at'];
const baseFieldsWithAlias = (alias) =>
	BASE_FIELDS.map((field) => `${alias}.${field}`).join(', ');

/**
 * Find users blocked by one blocker.
 *
 * @param {string} blockerId
 * @returns {Promise<Array>}
 */
export async function findByBlocker(blockerId) {
	const q = `
		SELECT
			${baseFieldsWithAlias('ub')},
			u.username AS blocked_username,
			u.email AS blocked_email
		FROM user_blocks ub
		INNER JOIN users u
			ON u.id = ub.blocked_id
		WHERE ub.blocker_id = $1
		ORDER BY ub.created_at DESC;
	`;

	return queryRows(q, [blockerId]);
}

/**
 * Count users blocked by one blocker.
 *
 * @param {string} blockerId
 * @returns {Promise<number>}
 */
export async function countByBlocker(blockerId) {
	const q = `
		SELECT COUNT(*)::int AS count
		FROM user_blocks
		WHERE blocker_id = $1;
	`;

	const rows = await queryRows(q, [blockerId]);
	return rows[0]?.count || 0;
}

/**
 * Check whether one user has blocked another.
 *
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {Promise<boolean>}
 */
export async function exists(blockerId, blockedId) {
	const q = `
		SELECT 1
		FROM user_blocks
		WHERE blocker_id = $1
			AND blocked_id = $2
		LIMIT 1;
	`;

	const result = await query(q, [blockerId, blockedId]);
	return result.rowCount > 0;
}

/**
 * Create one block relationship.
 *
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {Promise<boolean>}
 */
export async function create(blockerId, blockedId) {
	const q = `
		INSERT INTO user_blocks (blocker_id, blocked_id)
		VALUES ($1, $2)
		ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
	`;

	const result = await query(q, [blockerId, blockedId]);
	return result.rowCount > 0;
}

/**
 * Remove one block relationship.
 *
 * @param {string} blockerId
 * @param {string} blockedId
 * @returns {Promise<boolean>}
 */
export async function remove(blockerId, blockedId) {
	const q = `
		DELETE FROM user_blocks
		WHERE blocker_id = $1
			AND blocked_id = $2;
	`;

	const result = await query(q, [blockerId, blockedId]);
	return result.rowCount > 0;
}

export default {
	findByBlocker,
	countByBlocker,
	exists,
	create,
	remove,
};
