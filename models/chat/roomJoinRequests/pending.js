//! models/chat/roomJoinRequests/pending.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_STATUSES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
} from '../../../constants/chat.js';

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
				FROM chat_conversation_members banned_member
				WHERE banned_member.conversation_id = cr.conversation_id
					AND banned_member.user_id = $1
					AND banned_member.status = $3::chat_member_status
					AND banned_member.archived_at IS NULL
			)
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
		CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
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
