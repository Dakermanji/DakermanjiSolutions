//! models/chat/Rooms.js

import pool from '../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES,
	CHAT_ROOM_VISIBILITY_JOIN_POLICIES,
} from '../../constants/chat.js';

/**
 * Create a room conversation, its room metadata, and the owner membership.
 *
 * @param {object} room
 * @param {string} room.ownerUserId
 * @param {string} room.name
 * @param {string|null} room.description
 * @param {string} room.visibility
 * @returns {Promise<object>}
 */
export async function createRoomConversation({
	ownerUserId,
	name,
	description = null,
	visibility,
}) {
	const conversationType = CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES[visibility];
	const joinPolicy = CHAT_ROOM_VISIBILITY_JOIN_POLICIES[visibility];

	if (!conversationType || !joinPolicy) {
		throw new Error('Unsupported chat room visibility.');
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const conversationRows = await client.query(
			`
				INSERT INTO chat_conversations (
					type,
					title,
					created_by_user_id
				)
				VALUES ($1, $2, $3)
				RETURNING id, type, title, created_by_user_id, last_message_id, created_at, updated_at;
			`,
			[conversationType, name, ownerUserId],
		);
		const conversation = conversationRows.rows[0];

		const roomRows = await client.query(
			`
				INSERT INTO chat_rooms (
					conversation_id,
					description,
					visibility,
					join_policy
				)
				VALUES ($1, $2, $3, $4)
				RETURNING id, conversation_id, description, visibility, join_policy, created_at, updated_at;
			`,
			[conversation.id, description, visibility, joinPolicy],
		);
		const room = roomRows.rows[0];

		await client.query(
			`
				INSERT INTO chat_conversation_members (
					conversation_id,
					user_id,
					role
				)
				VALUES ($1, $2, $3);
			`,
			[
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

export default {
	createRoomConversation,
};
