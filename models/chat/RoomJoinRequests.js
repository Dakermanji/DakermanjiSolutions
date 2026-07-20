//! models/chat/RoomJoinRequests.js

import pool, { queryRows } from '../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
	CHAT_ROOM_JOIN_POLICIES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
	CHAT_ROOM_VISIBILITY,
} from '../../constants/chat.js';

/**
 * Create or refresh a pending request for a listed private room.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function createPrivateListedRoomRequest({
	conversationId,
	userId,
}) {
	const q = `
		INSERT INTO chat_room_join_requests (
			room_id,
			requested_by_user_id,
			status
		)
		SELECT
			cr.id,
			$2,
			$5
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		WHERE cr.conversation_id = $1
			AND cr.visibility = $3
			AND cr.join_policy = $4
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
			AND NOT EXISTS (
				SELECT 1
				FROM chat_conversation_members ccm
				WHERE ccm.conversation_id = cr.conversation_id
					AND ccm.user_id = $2
					AND ccm.archived_at IS NULL
			)
		ON CONFLICT (room_id, requested_by_user_id)
			WHERE status = 'pending'
		DO UPDATE SET
			updated_at = NOW()
		RETURNING
			id,
			room_id,
			requested_by_user_id,
			status,
			created_at,
			updated_at;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
		CHAT_ROOM_JOIN_POLICIES.REQUEST,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
	]);

	return rows[0] || null;
}

/**
 * Find notification recipients and display context for one pending join request.
 *
 * @param {string} requestId
 * @returns {Promise<Array>}
 */
export function findPendingJoinRequestNotificationRecipients(requestId) {
	const q = `
		SELECT
			cjr.id AS request_id,
			cjr.requested_by_user_id,
			cr.id AS room_id,
			cr.conversation_id,
			cc.title AS room_title,
			ccm.user_id AS recipient_user_id,
			ccm.role AS recipient_role,
			requester.username AS requester_username,
			requester.email AS requester_email
		FROM chat_room_join_requests cjr
		INNER JOIN chat_rooms cr
			ON cr.id = cjr.room_id
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cr.conversation_id
			AND ccm.role IN ($2::chat_member_role, $3::chat_member_role)
			AND ccm.archived_at IS NULL
		INNER JOIN users requester
			ON requester.id = cjr.requested_by_user_id
		WHERE cjr.id = $1
			AND cjr.status = $4::chat_room_join_request_status
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL;
	`;

	return queryRows(q, [
		requestId,
		CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
		CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
	]);
}

/**
 * List pending room join requests created by one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export function findPendingRequestsForUser(userId) {
	const q = `
		SELECT
			cjr.id AS request_id,
			cjr.status AS request_status,
			cjr.created_at AS request_created_at,
			cjr.updated_at AS request_updated_at,
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.keywords,
			cr.visibility,
			cr.join_policy,
			cc.type AS conversation_type,
			cc.title,
			cc.created_by_user_id,
			cc.created_at,
			cc.updated_at,
			owner.username AS owner_username,
			owner.email AS owner_email
		FROM chat_room_join_requests cjr
		INNER JOIN chat_rooms cr
			ON cr.id = cjr.room_id
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		WHERE cjr.requested_by_user_id = $1
			AND cjr.status = $2::chat_room_join_request_status
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
			AND NOT EXISTS (
				SELECT 1
				FROM chat_conversation_members ccm
				WHERE ccm.conversation_id = cr.conversation_id
					AND ccm.user_id = $1
					AND ccm.archived_at IS NULL
			)
		ORDER BY
			cjr.updated_at DESC,
			LOWER(cc.title) ASC;
	`;

	return queryRows(q, [
		userId,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
	]);
}

/**
 * Cancel one pending room join request owned by a user.
 *
 * @param {object} input
 * @param {string} input.requestId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function cancelPendingRequestForUser({ requestId, userId }) {
	const q = `
		UPDATE chat_room_join_requests
		SET
			status = $3::chat_room_join_request_status,
			reviewed_by_user_id = NULL,
			reviewed_at = NULL,
			canceled_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
			AND requested_by_user_id = $2
			AND status = $4::chat_room_join_request_status
		RETURNING
			id,
			room_id,
			requested_by_user_id,
			reviewed_by_user_id,
			status,
			reviewed_at,
			canceled_at,
			created_at,
			updated_at;
	`;

	const rows = await queryRows(q, [
		requestId,
		userId,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.CANCELED,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
	]);

	return rows[0] || null;
}

/**
 * Approve one pending room join request as a room owner/admin.
 *
 * @param {object} input
 * @param {string} input.requestId
 * @param {string} input.reviewerUserId
 * @returns {Promise<object|null>}
 */
export async function approvePendingRequestByManager({
	requestId,
	reviewerUserId,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const reviewResult = await client.query(
			`
				WITH reviewed_request AS (
					UPDATE chat_room_join_requests cjr
					SET
						status = $3::chat_room_join_request_status,
						reviewed_by_user_id = $2,
						reviewed_at = NOW(),
						canceled_at = NULL,
						updated_at = NOW()
					FROM chat_rooms cr
					INNER JOIN chat_conversations cc
						ON cc.id = cr.conversation_id
					INNER JOIN chat_conversation_members reviewer
						ON reviewer.conversation_id = cr.conversation_id
						AND reviewer.user_id = $2
						AND reviewer.role IN ($5::chat_member_role, $6::chat_member_role)
						AND reviewer.status = $7::chat_member_status
						AND reviewer.archived_at IS NULL
					WHERE cjr.id = $1
						AND cjr.room_id = cr.id
						AND cjr.status = $4::chat_room_join_request_status
						AND cr.archived_at IS NULL
						AND cc.archived_at IS NULL
					RETURNING
						cjr.id,
						cjr.room_id,
						cjr.requested_by_user_id,
						cjr.reviewed_by_user_id,
						cjr.status,
						cjr.reviewed_at,
						cjr.canceled_at,
						cjr.created_at,
						cjr.updated_at
				)
				SELECT
					reviewed_request.*,
					cr.conversation_id,
					cc.title AS room_title
				FROM reviewed_request
				INNER JOIN chat_rooms cr
					ON cr.id = reviewed_request.room_id
				INNER JOIN chat_conversations cc
					ON cc.id = cr.conversation_id;
			`,
			[
				requestId,
				reviewerUserId,
				CHAT_ROOM_JOIN_REQUEST_STATUSES.APPROVED,
				CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
				CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
				CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
				CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
			],
		);
		const request = reviewResult.rows[0];

		if (!request) {
			await client.query('ROLLBACK');
			return null;
		}

		await client.query(
			`
				INSERT INTO chat_conversation_members (
					conversation_id,
					user_id,
					role,
					status,
					archived_at
				)
				VALUES ($1, $2, $3, $4, NULL)
				ON CONFLICT (conversation_id, user_id)
				DO UPDATE SET
					role = EXCLUDED.role,
					status = EXCLUDED.status,
					archived_at = NULL,
					updated_at = NOW();
			`,
			[
				request.conversation_id,
				request.requested_by_user_id,
				CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
				CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
			],
		);

		await client.query('COMMIT');
		return request;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Reject one pending room join request as a room owner/admin.
 *
 * @param {object} input
 * @param {string} input.requestId
 * @param {string} input.reviewerUserId
 * @returns {Promise<object|null>}
 */
export async function rejectPendingRequestByManager({
	requestId,
	reviewerUserId,
}) {
	const q = `
		WITH reviewed_request AS (
			UPDATE chat_room_join_requests cjr
			SET
				status = $3::chat_room_join_request_status,
				reviewed_by_user_id = $2,
				reviewed_at = NOW(),
				canceled_at = NULL,
				updated_at = NOW()
			FROM chat_rooms cr
			INNER JOIN chat_conversations cc
				ON cc.id = cr.conversation_id
			INNER JOIN chat_conversation_members reviewer
				ON reviewer.conversation_id = cr.conversation_id
				AND reviewer.user_id = $2
				AND reviewer.role IN ($5::chat_member_role, $6::chat_member_role)
				AND reviewer.status = $7::chat_member_status
				AND reviewer.archived_at IS NULL
			WHERE cjr.id = $1
				AND cjr.room_id = cr.id
				AND cjr.status = $4::chat_room_join_request_status
				AND cr.archived_at IS NULL
				AND cc.archived_at IS NULL
			RETURNING
				cjr.id,
				cjr.room_id,
				cjr.requested_by_user_id,
				cjr.reviewed_by_user_id,
				cjr.status,
				cjr.reviewed_at,
				cjr.canceled_at,
				cjr.created_at,
				cjr.updated_at
		)
		SELECT
			reviewed_request.*,
			cr.conversation_id,
			cc.title AS room_title
		FROM reviewed_request
		INNER JOIN chat_rooms cr
			ON cr.id = reviewed_request.room_id
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id;
	`;

	const rows = await queryRows(q, [
		requestId,
		reviewerUserId,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.REJECTED,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
		CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
		CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	]);

	return rows[0] || null;
}

export default {
	approvePendingRequestByManager,
	cancelPendingRequestForUser,
	createPrivateListedRoomRequest,
	findPendingRequestsForUser,
	findPendingJoinRequestNotificationRecipients,
	rejectPendingRequestByManager,
};
