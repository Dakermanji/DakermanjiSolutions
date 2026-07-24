//! models/chat/rooms/unread.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_ROOM_VISIBILITY,
} from '../../../constants/chat.js';

const readableMemberStatuses = CHAT_CONVERSATION_MEMBER_READ_STATUSES
	.map((status) => `'${status}'`)
	.join(', ');

async function countUnreadRoomMessagesForUserByVisibility(
	userId,
	visibilityCondition,
	params,
) {
	const q = `
		SELECT COUNT(unread_messages.id)::int AS unread_count
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		INNER JOIN chat_messages unread_messages
			ON unread_messages.conversation_id = cc.id
			AND unread_messages.sender_user_id <> $1
			AND unread_messages.deleted_at IS NULL
		LEFT JOIN chat_messages read_message
			ON read_message.id = ccm.last_read_message_id
		WHERE ${visibilityCondition}
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
			AND (
				ccm.last_read_message_id IS NULL
				OR unread_messages.created_at > read_message.created_at
				OR (
					unread_messages.created_at = read_message.created_at
					AND unread_messages.id > read_message.id
				)
			);
	`;

	const rows = await queryRows(q, params);
	return rows[0]?.unread_count || 0;
}

/**
 * Count unread room messages for one user across joined rooms.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countUnreadRoomMessagesForUser(userId) {
	const q = `
		SELECT COUNT(unread_messages.id)::int AS unread_count
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		INNER JOIN chat_messages unread_messages
			ON unread_messages.conversation_id = cc.id
			AND unread_messages.sender_user_id <> $1
			AND unread_messages.deleted_at IS NULL
		LEFT JOIN chat_messages read_message
			ON read_message.id = ccm.last_read_message_id
		WHERE cr.archived_at IS NULL
			AND cc.archived_at IS NULL
			AND (
				ccm.last_read_message_id IS NULL
				OR unread_messages.created_at > read_message.created_at
				OR (
					unread_messages.created_at = read_message.created_at
					AND unread_messages.id > read_message.id
				)
			);
	`;

	const rows = await queryRows(q, [userId]);
	return rows[0]?.unread_count || 0;
}

/**
 * Count unread joined public room messages for one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export function countUnreadPublicRoomMessagesForUser(userId) {
	return countUnreadRoomMessagesForUserByVisibility(
		userId,
		'cr.visibility = $2',
		[userId, CHAT_ROOM_VISIBILITY.PUBLIC],
	);
}

/**
 * Count unread joined private room messages for one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export function countUnreadPrivateRoomMessagesForUser(userId) {
	return countUnreadRoomMessagesForUserByVisibility(
		userId,
		'cr.visibility IN ($2, $3)',
		[
			userId,
			CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
			CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED,
		],
	);
}
