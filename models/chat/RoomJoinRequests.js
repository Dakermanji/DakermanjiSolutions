//! models/chat/RoomJoinRequests.js

import { queryRows } from '../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
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

export default {
	createPrivateListedRoomRequest,
	findPendingRequestsForUser,
	findPendingJoinRequestNotificationRecipients,
};
