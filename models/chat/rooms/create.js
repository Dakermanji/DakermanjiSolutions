//! models/chat/rooms/create.js

import { randomUUID } from 'node:crypto';
import pool from '../../../config/database.js';
import { CHAT_CONVERSATION_MEMBER_ROLES } from '../../../constants/chat.js';

/**
 * Create a room conversation, its room metadata, and the owner membership.
 *
 * @param {object} room
 * @param {string} room.ownerUserId
 * @param {string} room.name
 * @param {string|null} room.description
 * @param {Array<string>} room.keywords
 * @param {string} room.conversationType
 * @param {string} room.visibility
 * @param {string} room.joinPolicy
 * @returns {Promise<object>}
 */
export async function createRoomConversation({
	ownerUserId,
	name,
	description = null,
	keywords,
	conversationType,
	visibility,
	joinPolicy,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const conversationRows = await client.query(
			`
				INSERT INTO chat_conversations (
					id,
					type,
					title,
					created_by_user_id
				)
				VALUES ($1, $2, $3, $4)
				RETURNING id, type, title, created_by_user_id, last_message_id, created_at, updated_at;
			`,
			[randomUUID(), conversationType, name, ownerUserId],
		);
		const conversation = conversationRows.rows[0];

		const roomRows = await client.query(
			`
				INSERT INTO chat_rooms (
					id,
					conversation_id,
					description,
					keywords,
					visibility,
					join_policy
				)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id, conversation_id, description, keywords, visibility, join_policy, created_at, updated_at;
			`,
			[randomUUID(), conversation.id, description, keywords, visibility, joinPolicy],
		);
		const room = roomRows.rows[0];

		await client.query(
			`
				INSERT INTO chat_conversation_members (
					id,
					conversation_id,
					user_id,
					role
				)
				VALUES ($1, $2, $3, $4);
			`,
			[
				randomUUID(),
				conversation.id,
				ownerUserId,
				CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
			],
		);

		await client.query('COMMIT');

		return {
			...conversation,
			room_id: room.id,
			conversation_id: conversation.id,
			description: room.description,
			keywords: room.keywords,
			visibility: room.visibility,
			join_policy: room.join_policy,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
