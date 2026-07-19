//! models/chat/Rooms.js

import pool, { queryRows } from '../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_ROOM_JOIN_POLICIES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
	CHAT_ROOM_VISIBILITY,
} from '../../constants/chat.js';

function buildVisibleRoomsQuery(visibilityCondition) {
	return `
		SELECT
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.keywords,
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

function buildVisibleRoomsCountQuery(visibilityCondition) {
	return `
		SELECT COUNT(*)::int AS room_count
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
		WHERE ${visibilityCondition}
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL;
	`;
}

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
					keywords,
					visibility,
					join_policy
				)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id, conversation_id, description, keywords, visibility, join_policy, created_at, updated_at;
			`,
			[conversation.id, description, keywords, visibility, joinPolicy],
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
 * Count joined public rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countPublicRoomsForUser(userId) {
	const rows = await queryRows(
		buildVisibleRoomsCountQuery('cr.visibility = $2'),
		[userId, CHAT_ROOM_VISIBILITY.PUBLIC],
	);

	return rows[0]?.room_count || 0;
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

/**
 * Find one visible room conversation for one user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findVisibleRoomConversationForUser(
	conversationId,
	userId,
) {
	const q = `
		SELECT
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.keywords,
			cr.visibility,
			cr.join_policy,
			cc.type AS conversation_type,
			cc.title,
			cc.created_by_user_id,
			cc.last_message_id,
			cc.updated_at,
			ccm.role AS member_role,
			ccm.last_read_message_id,
			pending_request.status AS pending_request_status,
			owner.username AS owner_username,
			owner.email AS owner_email
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $2
			AND ccm.archived_at IS NULL
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		LEFT JOIN chat_room_join_requests pending_request
			ON pending_request.room_id = cr.id
			AND pending_request.requested_by_user_id = $2
			AND pending_request.status = $3
		WHERE cr.conversation_id = $1
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
	]);
	return rows[0] || null;
}

/**
 * Count joined private rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countPrivateRoomsForUser(userId) {
	const rows = await queryRows(
		buildVisibleRoomsCountQuery('cr.visibility IN ($2, $3)'),
		[
			userId,
			CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
			CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED,
		],
	);

	return rows[0]?.room_count || 0;
}

/**
 * Search rooms visible in room discovery.
 *
 * Public and listed private rooms can be discovered by everyone.
 * Unlisted private rooms are searchable only by existing members.
 *
 * @param {object} input
 * @param {string} input.userId
 * @param {string} input.query
 * @param {number} input.limit
 * @returns {Promise<Array>}
 */
export function searchVisibleRoomsForUser({ userId, query, limit }) {
	const q = `
		SELECT
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.keywords,
			cr.visibility,
			cr.join_policy,
			cc.type AS conversation_type,
			cc.title,
			cc.created_by_user_id,
			cc.last_message_id,
			cc.created_at,
			cc.updated_at,
			ccm.role AS member_role,
			ccm.last_read_message_id,
			pending_request.status AS pending_request_status,
			owner.username AS owner_username,
			owner.email AS owner_email
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		LEFT JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
		LEFT JOIN chat_room_join_requests pending_request
			ON pending_request.room_id = cr.id
			AND pending_request.requested_by_user_id = $1
			AND pending_request.status = $6
		WHERE cr.archived_at IS NULL
			AND cc.archived_at IS NULL
			AND (
				cr.visibility IN ($3, $4)
				OR (
					cr.visibility = $5
					AND ccm.user_id IS NOT NULL
				)
			)
			AND (
				cc.title ILIKE $2 ESCAPE '!'
				OR EXISTS (
					SELECT 1
					FROM unnest(cr.keywords) AS room_keyword(keyword)
					WHERE room_keyword.keyword ILIKE $2 ESCAPE '!'
				)
				OR COALESCE(cr.description, '') ILIKE $2 ESCAPE '!'
			)
		ORDER BY
			(ccm.user_id IS NULL) ASC,
			CASE
				WHEN cc.title ILIKE $2 ESCAPE '!' THEN 0
				WHEN EXISTS (
					SELECT 1
					FROM unnest(cr.keywords) AS room_keyword(keyword)
					WHERE room_keyword.keyword ILIKE $2 ESCAPE '!'
				) THEN 1
				WHEN COALESCE(cr.description, '') ILIKE $2 ESCAPE '!' THEN 2
				ELSE 3
			END,
			LOWER(cc.title) ASC,
			cc.created_at DESC
		LIMIT $7;
	`;

	return queryRows(q, [
		userId,
		query,
		CHAT_ROOM_VISIBILITY.PUBLIC,
		CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
		CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
		limit,
	]);
}

/**
 * Join a public room by conversation id.
 *
 * Existing archived memberships are restored so the operation is idempotent.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function joinPublicRoomConversation({ conversationId, userId }) {
	const q = `
		INSERT INTO chat_conversation_members (
			conversation_id,
			user_id,
			role,
			archived_at
		)
		SELECT
			cr.conversation_id,
			$2,
			$5,
			NULL
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		WHERE cr.conversation_id = $1
			AND cr.visibility = $3
			AND cr.join_policy = $4
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
		ON CONFLICT (conversation_id, user_id)
		DO UPDATE SET
			archived_at = NULL,
			updated_at = NOW()
		RETURNING
			conversation_id,
			user_id,
			role,
			last_read_message_id,
			joined_at,
			updated_at;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		CHAT_ROOM_VISIBILITY.PUBLIC,
		CHAT_ROOM_JOIN_POLICIES.OPEN,
		CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
	]);

	return rows[0] || null;
}

export default {
	countPrivateRoomsForUser,
	countPublicRoomsForUser,
	createRoomConversation,
	findPrivateRoomsForUser,
	findPublicRoomsForUser,
	findVisibleRoomConversationForUser,
	joinPublicRoomConversation,
	searchVisibleRoomsForUser,
};
