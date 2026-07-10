//! models/ChatMessages.js

import pool from '../config/database.js';

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
	createConversationMessage,
};
