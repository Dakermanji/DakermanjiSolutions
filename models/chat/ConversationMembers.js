//! models/chat/ConversationMembers.js

import { queryRows } from '../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_MANAGE_ROLES,
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
 * Mark one member as having read through the conversation's latest message.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function markReadThroughLatestMessage(conversationId, userId) {
	const q = `
		UPDATE chat_conversation_members ccm
		SET
			last_read_message_id = cc.last_message_id,
			updated_at = NOW()
		FROM chat_conversations cc
		WHERE ccm.conversation_id = cc.id
			AND ccm.conversation_id = $1
			AND ccm.user_id = $2
			AND cc.last_message_id IS NOT NULL
		RETURNING
			ccm.conversation_id,
			ccm.user_id,
			ccm.last_read_message_id,
			ccm.updated_at;
	`;

	const rows = await queryRows(q, [conversationId, userId]);
	return rows[0] || null;
}

export default {
	findConversationMemberUserIds,
	findPendingMessageRecipientUserIds,
	markReadThroughLatestMessage,
};
