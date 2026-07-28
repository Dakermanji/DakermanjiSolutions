//! models/chat/rooms/members.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_ROLES,
} from '../../../constants/chat.js';

const readableMemberStatuses = CHAT_CONVERSATION_MEMBER_READ_STATUSES
	.map((status) => `'${status}'`)
	.join(', ');

const roleSortOrder = [
	CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
	CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
	CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
];

const roleSortSql = roleSortOrder
	.map((role, index) => `WHEN '${role}' THEN ${index + 1}`)
	.join(' ');

/**
 * Find readable members for one room conversation.
 *
 * @param {string} conversationId
 * @returns {Promise<Array>}
 */
export function findRoomConversationMembers(conversationId) {
	const q = `
		SELECT
			ccm.conversation_id,
			ccm.user_id,
			ccm.role,
			ccm.status,
			ccm.joined_at,
			ccm.last_read_message_id,
			u.username,
			u.email,
			u.avatar_seed,
			u.country_code
		FROM chat_conversation_members ccm
		INNER JOIN users u
			ON u.id = ccm.user_id
		WHERE ccm.conversation_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		ORDER BY
			CASE ccm.role ${roleSortSql} ELSE 99 END,
			LOWER(COALESCE(u.username, u.email)),
			ccm.joined_at ASC;
	`;

	return queryRows(q, [conversationId]);
}
