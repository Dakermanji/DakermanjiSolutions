//! models/chat/conversations/self.js

import pool, { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_TYPES,
} from '../../../constants/chat.js';

/**
 * Find one self-notes conversation for a user.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findSelfConversationForUser(userId) {
	const q = `
		SELECT
			cc.id AS conversation_id,
			cc.last_message_id,
			cc.updated_at,
			lm.created_at AS last_message_created_at,
			ccm.last_read_message_id,
			0::int AS unread_count,
			self_user.id AS user_id,
			self_user.username AS username,
			self_user.email AS email,
			self_user.avatar_seed AS avatar_seed,
			self_user.country_code AS country_code
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $2
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
		INNER JOIN users self_user
			ON self_user.id = $1
		LEFT JOIN chat_messages lm
			ON lm.id = cc.last_message_id
		WHERE cdc.user_one_id = $1
			AND cdc.user_two_id = $1
		LIMIT 1;
	`;

	const rows = await queryRows(q, [userId, CHAT_CONVERSATION_TYPES.SELF]);
	return rows[0] || null;
}

/**
 * Find one self-notes conversation by id if it belongs to the user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findSelfConversationForUserById(conversationId, userId) {
	const q = `
		SELECT
			cc.id AS conversation_id,
			cc.last_message_id,
			cc.updated_at,
			lm.created_at AS last_message_created_at,
			ccm.last_read_message_id,
			0::int AS unread_count,
			self_user.id AS user_id,
			self_user.username AS username,
			self_user.email AS email,
			self_user.avatar_seed AS avatar_seed,
			self_user.country_code AS country_code
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $3
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $2
		INNER JOIN users self_user
			ON self_user.id = $2
		LEFT JOIN chat_messages lm
			ON lm.id = cc.last_message_id
		WHERE cc.id = $1
			AND cdc.user_one_id = $2
			AND cdc.user_two_id = $2
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		CHAT_CONVERSATION_TYPES.SELF,
	]);
	return rows[0] || null;
}

/**
 * Create a self-notes conversation if one does not already exist.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findOrCreateSelfConversation(userId) {
	if (!userId) {
		return null;
	}

	const existingConversation = await findSelfConversationForUser(userId);
	if (existingConversation) {
		return existingConversation;
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const conversationRows = await client.query(
			`
				INSERT INTO chat_conversations (
					type,
					created_by_user_id
				)
				VALUES ($1, $2)
				RETURNING id;
			`,
			[CHAT_CONVERSATION_TYPES.SELF, userId],
		);
		const conversation = conversationRows.rows[0];

		const directRows = await client.query(
			`
				INSERT INTO chat_direct_conversations (
					conversation_id,
					user_one_id,
					user_two_id
				)
				VALUES ($1, $2, $2)
				ON CONFLICT (user_one_id, user_two_id) DO NOTHING
				RETURNING conversation_id;
			`,
			[conversation.id, userId],
		);

		if (directRows.rowCount === 0) {
			await client.query(
				'DELETE FROM chat_conversations WHERE id = $1;',
				[conversation.id],
			);
			await client.query('COMMIT');
			return findSelfConversationForUser(userId);
		}

		await client.query(
			`
				INSERT INTO chat_conversation_members (
					conversation_id,
					user_id,
					role
				)
				VALUES ($1, $2, $3)
				ON CONFLICT (conversation_id, user_id) DO NOTHING;
			`,
			[
				conversation.id,
				userId,
				CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
			],
		);

		await client.query('COMMIT');
		return findSelfConversationForUser(userId);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
