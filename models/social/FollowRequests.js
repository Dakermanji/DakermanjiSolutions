//! models/social/FollowRequests.js

import { query, queryRows } from '../../config/database.js';

const BASE_FIELDS = ['id', 'requester_id', 'target_id', 'status', 'created_at'];

const baseFieldsSQL = BASE_FIELDS.join(', ');

const baseFieldsWithAlias = (alias) =>
	BASE_FIELDS.map((f) => `${alias}.${f}`).join(', ');

/**
 * Find a pending follow request between two users.
 *
 * @param {string} requesterId
 * @param {string} targetId
 * @returns {Promise}
 */
export async function findPending(requesterId, targetId) {
	const q = `
		SELECT ${baseFieldsSQL}
		FROM user_follow_requests
		WHERE requester_id = $1
			AND target_id = $2
			AND status = 'pending'
		LIMIT 1;
	`;

	const rows = await queryRows(q, [requesterId, targetId]);
	return rows[0] || null;
}

/**
 * Create a pending follow request.
 *
 * @param {{ requesterId: string, targetId: string }} params
 * @returns {Promise}
 */
export async function create({ requesterId, targetId }) {
	const q = `
		INSERT INTO user_follow_requests (
			requester_id,
			target_id
		)
		VALUES ($1, $2)
		RETURNING ${baseFieldsSQL}
	`;

	const rows = await queryRows(q, [requesterId, targetId]);
	return rows[0] || null;
}

/**
 * Find one follow request for its target user.
 *
 * Responsibilities:
 * - ensure the request belongs to the target user
 * - return only one request
 * - expose enough data for response actions
 *
 * @param {string} requestId
 * @param {string} targetId
 * @returns {Promise}
 */
export async function findByIdForTarget(requestId, targetId) {
	const q = `
		SELECT
			${baseFieldsWithAlias('ufr')},
			u.username AS requester_username
		FROM user_follow_requests ufr
		INNER JOIN users u
			ON u.id = ufr.requester_id
		WHERE ufr.id = $1
			AND ufr.target_id = $2
		LIMIT 1;
	`;

	const rows = await queryRows(q, [requestId, targetId]);
	return rows[0] || null;
}

/**
 * Accept a pending follow request for its target user.
 *
 * Responsibilities:
 * - only accept requests owned by the target user
 * - only accept pending requests
 *
 * @param {string} requestId
 * @param {string} targetId
 * @returns {Promise<boolean>}
 */
export async function accept(requestId, targetId) {
	const q = `
		UPDATE user_follow_requests
		SET
			status = 'accepted',
			responded_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
			AND target_id = $2
			AND status = 'pending';
	`;

	const result = await query(q, [requestId, targetId]);
	return result.rowCount > 0;
}

/**
 * Reject a pending follow request for its target user.
 *
 * Responsibilities:
 * - only reject requests owned by the target user
 * - only reject pending requests
 *
 * @param {string} requestId
 * @param {string} targetId
 * @returns {Promise<boolean>}
 */
export async function reject(requestId, targetId) {
	const q = `
		UPDATE user_follow_requests
		SET
			status = 'rejected',
			responded_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
			AND target_id = $2
			AND status = 'pending';
	`;

	const result = await query(q, [requestId, targetId]);
	return result.rowCount > 0;
}

export default {
	findPending,
	create,
	findByIdForTarget,
	accept,
	reject,
};
