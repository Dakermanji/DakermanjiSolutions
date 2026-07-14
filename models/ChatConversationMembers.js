//! models/ChatConversationMembers.js

import { queryRows } from '../config/database.js';

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
	markReadThroughLatestMessage,
};
