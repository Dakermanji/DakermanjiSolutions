//! models/chat/Rooms.js

import pool, { queryRows } from '../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_ROOM_VISIBILITY,
} from '../../constants/chat.js';

function buildVisibleRoomsQuery(visibilityCondition) {
	return `
		SELECT
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.visibility,
			cr.join_policy,
			cc.type AS conversation_type,
			cc.title,
			cc.created_by_user_id,
			cc.last_message_id,
			cc.created_at,
			cc.updated_at,
			lm.created_at AS last_message_created_at,
			ccm.role AS member_role,
			ccm.last_read_message_id,
			owner.username AS owner_username,
			owner.email AS owner_email,
			(
				SELECT COUNT(*)::int
				FROM chat_messages unread_messages
				LEFT JOIN chat_messages read_message
					ON read_message.id = ccm.last_read_message_id
				WHERE unread_messages.conversation_id = cc.id
					AND unread_messages.sender_user_id <> $1
					AND unread_messages.deleted_at IS NULL
					AND (
						ccm.last_read_message_id IS NULL
						OR unread_messages.created_at > read_message.created_at
						OR (
							unread_messages.created_at = read_message.created_at
							AND unread_messages.id > read_message.id
						)
					)
			) AS unread_count
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		LEFT JOIN chat_messages lm
			ON lm.id = cc.last_message_id
		WHERE ${visibilityCondition}
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
		ORDER BY
			(lm.id IS NULL) ASC,
			lm.created_at DESC,
			LOWER(cc.title) ASC;
	`;
}

/**
 * Create a room conversation, its room metadata, and the owner membership.
 *
 * @param {object} room
 * @param {string} room.ownerUserId
 * @param {string} room.name
 * @param {string|null} room.description
 * @param {string} room.conversationType
 * @param {string} room.visibility
 * @param {string} room.joinPolicy
 * @returns {Promise<object>}
 */
export async function createRoomConversation({
	ownerUserId,
	name,
	description = null,
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

/**
 * Find joined public rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export function findPublicRoomsForUser(userId) {
	return queryRows(
		buildVisibleRoomsQuery('cr.visibility = $2'),
		[userId, CHAT_ROOM_VISIBILITY.PUBLIC],
	);
}

/**
 * Find joined private rooms visible to one user.
 *
 * Includes listed and unlisted private rooms once the user is a member.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export function findPrivateRoomsForUser(userId) {
	return queryRows(
		buildVisibleRoomsQuery('cr.visibility IN ($2, $3)'),
		[
			userId,
			CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
			CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED,
		],
	);
}

export default {
	createRoomConversation,
	findPrivateRoomsForUser,
	findPublicRoomsForUser,
};
