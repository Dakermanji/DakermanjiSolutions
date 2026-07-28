//! models/chat/roomJoinRequests/create.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_STATUSES,
	CHAT_ROOM_JOIN_POLICIES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
	CHAT_ROOM_VISIBILITY,
} from '../../../constants/chat.js';

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
				FROM chat_conversation_members banned_member
				WHERE banned_member.conversation_id = cr.conversation_id
					AND banned_member.user_id = $2
					AND banned_member.status = $6::chat_member_status
					AND banned_member.archived_at IS NULL
			)
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
		CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
	]);

	return rows[0] || null;
}
