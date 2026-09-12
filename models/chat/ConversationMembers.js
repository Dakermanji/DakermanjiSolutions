//! models/chat/ConversationMembers.js

import { queryRows } from '../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_MANAGE_ROLES,
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
} from '../../constants/chat.js';

/**
 * List user ids for members in one conversation.
 *
 * @param {string} conversationId
 * @returns {Promise<Array<string>>}
 */
export async function findConversationMemberUserIds(conversationId) {
	const q = `
		SELECT user_id
		FROM chat_conversation_members
		WHERE conversation_id = $1;
	`;

	const rows = await queryRows(q, [conversationId]);
	return rows.map((row) => row.user_id);
}

/**
 * List user ids allowed to see one pending moderated message.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.senderUserId
 * @returns {Promise<Array<string>>}
 */
export async function findPendingMessageRecipientUserIds({
	conversationId,
	senderUserId,
}) {
	const q = `
		SELECT user_id
		FROM chat_conversation_members
		WHERE conversation_id = $1
			AND archived_at IS NULL
			AND (
				user_id = $2
				OR (
					role = ANY($3::chat_member_role[])
					AND status = $4::chat_member_status
				)
			);
	`;

	const rows = await queryRows(q, [
		conversationId,
		senderUserId,
		CHAT_CONVERSATION_MEMBER_MANAGE_ROLES,
		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	]);

	return rows.map((row) => row.user_id);
}

/**
 * Count unread messages in one conversation for one member.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countUnreadMessagesForUser(conversationId, userId) {
	const q = `
		SELECT COUNT(unread_message.id)::int AS unread_count
		FROM chat_conversation_members ccm
		INNER JOIN chat_messages unread_message
			ON unread_message.conversation_id = ccm.conversation_id
			AND unread_message.sender_user_id <> ccm.user_id
			AND unread_message.deleted_at IS NULL
			AND (
				unread_message.moderation_status = 'visible'
				OR (
					unread_message.moderation_status = 'pending_review'
					AND ccm.role = ANY($3::chat_member_role[])
					AND ccm.status = $4::chat_member_status
				)
			)
		LEFT JOIN chat_messages read_message
			ON read_message.id = ccm.last_read_message_id
		WHERE ccm.conversation_id = $1
			AND ccm.user_id = $2
			AND ccm.archived_at IS NULL
			AND ccm.status = ANY($5::chat_member_status[])
			AND (
				ccm.last_read_message_id IS NULL
				OR unread_message.created_at > read_message.created_at
				OR (
					unread_message.created_at = read_message.created_at
					AND unread_message.id > read_message.id
				)
			);
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		CHAT_CONVERSATION_MEMBER_MANAGE_ROLES,
		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	]);

	return rows[0]?.unread_count || 0;
}

/**
 * Mark one member as having read through a specific conversation message.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @param {string} messageId
 * @returns {Promise<object|null>}
 */
export async function markReadThroughMessage(conversationId, userId, messageId) {
	const q = `
		WITH target_message AS (
			SELECT id, created_at
			FROM chat_messages
			WHERE conversation_id = $1
				AND id = $3
			LIMIT 1
		), updated_member AS (
			UPDATE chat_conversation_members ccm
			SET
				last_read_message_id = target.id,
				updated_at = NOW()
			FROM target_message target
			WHERE ccm.conversation_id = $1
				AND ccm.user_id = $2
				AND (
					ccm.last_read_message_id IS NULL
					OR EXISTS (
						SELECT 1
						FROM chat_messages current_message
						WHERE current_message.id = ccm.last_read_message_id
							AND (
								current_message.created_at < target.created_at
								OR (
									current_message.created_at = target.created_at
									AND current_message.id < target.id
								)
							)
					)
				)
			RETURNING
				ccm.conversation_id,
				ccm.user_id,
				ccm.last_read_message_id,
				ccm.updated_at
		)
		SELECT *, true AS advanced
		FROM updated_member
		UNION ALL
		SELECT
			ccm.conversation_id,
			ccm.user_id,
			ccm.last_read_message_id,
			ccm.updated_at,
			false AS advanced
		FROM chat_conversation_members ccm
		CROSS JOIN target_message
		WHERE ccm.conversation_id = $1
			AND ccm.user_id = $2
			AND NOT EXISTS (SELECT 1 FROM updated_member)
		LIMIT 1;
	`;

	const rows = await queryRows(q, [conversationId, userId, messageId]);
	return rows[0] || null;
}

export default {
	countUnreadMessagesForUser,
	findConversationMemberUserIds,
	findPendingMessageRecipientUserIds,
	markReadThroughMessage,
};
