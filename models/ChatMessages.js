//! models/ChatMessages.js

import pool, { queryRows } from '../config/database.js';

/**
 * List recent messages for one conversation in display order.
 *
 * @param {string} conversationId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function findRecentConversationMessages(
	conversationId,
	limit = 50,
) {
	const q = `
		SELECT *
		FROM (
			SELECT
				cm.id,
				cm.conversation_id,
				cm.sender_user_id,
				cm.body,
				cm.edited_at,
				cm.created_at,
				cm.updated_at,
				u.username AS sender_username,
				u.email AS sender_email
			FROM chat_messages cm
			INNER JOIN users u
				ON u.id = cm.sender_user_id
			WHERE cm.conversation_id = $1
				AND cm.deleted_at IS NULL
			ORDER BY cm.created_at DESC, cm.id DESC
			LIMIT $2
		) recent_messages
		ORDER BY recent_messages.created_at ASC, recent_messages.id ASC;
	`;

	return queryRows(q, [conversationId, limit]);
}

/**
 * Create a chat message and update the conversation's last message pointer.
 *
 * @param {object} message
 * @param {string} message.conversationId
 * @param {string} message.senderUserId
 * @param {string} message.body
 * @returns {Promise<object>}
 */
export async function createConversationMessage({
	conversationId,
	senderUserId,
	body,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const messageRows = await client.query(
			`
				INSERT INTO chat_messages (
					conversation_id,
					sender_user_id,
					body
				)
				VALUES ($1, $2, $3)
				RETURNING id, conversation_id, sender_user_id, body, created_at, updated_at;
			`,
			[conversationId, senderUserId, body],
		);
		const message = messageRows.rows[0];

		await client.query(
			`
				UPDATE chat_conversations
				SET
					last_message_id = $2,
					updated_at = NOW()
				WHERE id = $1;
			`,
			[conversationId, message.id],
		);

		await client.query(
			`
				UPDATE chat_conversation_members
				SET
					last_read_message_id = $3,
					updated_at = NOW()
				WHERE conversation_id = $1
					AND user_id = $2;
			`,
			[conversationId, senderUserId, message.id],
		);

		await client.query('COMMIT');
		return message;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export default {
	findRecentConversationMessages,
	createConversationMessage,
};
