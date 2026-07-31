//! models/chat/rooms/update.js

import pool from '../../../config/database.js';
import { CHAT_CONVERSATION_MEMBER_ROLES } from '../../../constants/chat.js';

function areStringArraysEqual(first = [], second = []) {
	if (first.length !== second.length) return false;

	return first.every((value, index) => value === second[index]);
}

function getChangedFields(existingRoom, updatedRoom) {
	const changedFields = [];

	if (existingRoom.title !== updatedRoom.title) {
		changedFields.push('name');
	}

	if ((existingRoom.description || '') !== (updatedRoom.description || '')) {
		changedFields.push('description');
	}

	if (!areStringArraysEqual(existingRoom.keywords || [], updatedRoom.keywords || [])) {
		changedFields.push('keywords');
	}

	if (existingRoom.visibility !== updatedRoom.visibility) {
		changedFields.push('visibility');
	}

	return changedFields;
}

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

		const existingRows = await client.query(
			`
				SELECT
					cr.id AS room_id,
					cr.description,
					cr.keywords,
					cr.visibility,
					cc.title
				FROM chat_rooms cr
				INNER JOIN chat_conversations cc
					ON cc.id = cr.conversation_id
				INNER JOIN chat_conversation_members owner_member
					ON owner_member.conversation_id = cc.id
					AND owner_member.user_id = $2
					AND owner_member.role = $3
					AND owner_member.archived_at IS NULL
				WHERE cr.conversation_id = $1
					AND cr.archived_at IS NULL
					AND cc.archived_at IS NULL;
			`,
			[
				conversationId,
				actorUserId,
				CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
			],
		);
		const existingRoom = existingRows.rows[0];

		if (!existingRoom) {
			await client.query('ROLLBACK');
			return null;
		}

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
			changed_fields: getChangedFields(existingRoom, {
				title: conversation.title,
				description: room.description,
				keywords: room.keywords,
				visibility: room.visibility,
			}),
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
