//! models/chat/rooms/access.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
	CHAT_ROOM_JOIN_POLICIES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
	CHAT_ROOM_VISIBILITY,
} from '../../../constants/chat.js';

const readableMemberStatuses = CHAT_CONVERSATION_MEMBER_READ_STATUSES
	.map((status) => `'${status}'`)
	.join(', ');

/**
 * Find one visible room conversation for one user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findVisibleRoomConversationForUser(
	conversationId,
	userId,
) {
	const q = `
		SELECT
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.keywords,
			cr.visibility,
			cr.join_policy,
			cc.type AS conversation_type,
			cc.title,
			cc.created_by_user_id,
			cc.last_message_id,
			cc.updated_at,
			ccm.role AS member_role,
			ccm.status AS member_status,
			ccm.last_read_message_id,
			pending_request.status AS pending_request_status,
			owner.username AS owner_username,
			owner.email AS owner_email
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $2
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		LEFT JOIN chat_room_join_requests pending_request
			ON pending_request.room_id = cr.id
			AND pending_request.requested_by_user_id = $2
			AND pending_request.status = $3
		WHERE cr.conversation_id = $1
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
	]);
	return rows[0] || null;
}

/**
 * Join a public room by conversation id.
 *
 * Existing archived memberships are restored so the operation is idempotent.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function joinPublicRoomConversation({ conversationId, userId }) {
	const q = `
		INSERT INTO chat_conversation_members (
			conversation_id,
			user_id,
			role,
			archived_at
		)
		SELECT
			cr.conversation_id,
			$2,
			$5,
			NULL
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
			)
		ON CONFLICT (conversation_id, user_id)
		DO UPDATE SET
			archived_at = NULL,
			updated_at = NOW()
		WHERE chat_conversation_members.status <> $6::chat_member_status
		RETURNING
			conversation_id,
			user_id,
			role,
			last_read_message_id,
			joined_at,
			updated_at;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		CHAT_ROOM_VISIBILITY.PUBLIC,
		CHAT_ROOM_JOIN_POLICIES.OPEN,
		CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
	]);

	return rows[0] || null;
}
