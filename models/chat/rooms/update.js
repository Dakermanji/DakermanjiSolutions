//! models/chat/rooms/update.js

import pool from '../../../config/database.js';
import { CHAT_CONVERSATION_MEMBER_ROLES } from '../../../constants/chat.js';

/**
 * Update room identity/settings. Owner only.
 *
 * @param {object} room
 * @param {string} room.conversationId
 * @param {string} room.actorUserId
 * @param {string} room.name
 * @param {string|null} room.description
 * @param {Array<string>} room.keywords
 * @param {string} room.conversationType
 * @param {string} room.visibility
 * @param {string} room.joinPolicy
 * @returns {Promise<object|null>}
 */
export async function updateRoomConversation({
	conversationId,
	actorUserId,
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
				UPDATE chat_conversations cc
				SET
					type = $3,
					title = $4,
					updated_at = NOW()
				FROM chat_conversation_members owner_member
				WHERE cc.id = $1
					AND cc.archived_at IS NULL
					AND owner_member.conversation_id = cc.id
					AND owner_member.user_id = $2
					AND owner_member.role = $5
					AND owner_member.archived_at IS NULL
				RETURNING cc.id, cc.type, cc.title, cc.created_by_user_id, cc.last_message_id, cc.created_at, cc.updated_at;
			`,
			[
				conversationId,
				actorUserId,
				conversationType,
				name,
				CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
			],
		);
		const conversation = conversationRows.rows[0];

		if (!conversation) {
			await client.query('ROLLBACK');
			return null;
		}

		const roomRows = await client.query(
			`
				UPDATE chat_rooms
				SET
					description = $2,
					keywords = $3,
					visibility = $4,
					join_policy = $5,
					updated_at = NOW()
				WHERE conversation_id = $1
					AND archived_at IS NULL
				RETURNING id, conversation_id, description, keywords, visibility, join_policy, created_at, updated_at;
			`,
			[conversation.id, description, keywords, visibility, joinPolicy],
		);
		const room = roomRows.rows[0];

		if (!room) {
			await client.query('ROLLBACK');
			return null;
		}

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
