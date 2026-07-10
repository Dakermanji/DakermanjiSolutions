//! models/ChatConversations.js

import pool, { queryRows } from '../config/database.js';

const FRIEND_CONVERSATION_TYPE = 'friend';
const MEMBER_ROLE = 'member';

function normalizeDirectPair(userAId, userBId) {
	return userAId <= userBId
		? [userAId, userBId]
		: [userBId, userAId];
}

/**
 * Find one direct conversation by normalized user pair.
 *
 * @param {string} userAId
 * @param {string} userBId
 * @returns {Promise<object|null>}
 */
export async function findDirectConversation(userAId, userBId) {
	const [userOneId, userTwoId] = normalizeDirectPair(userAId, userBId);
	const q = `
		SELECT
			cc.id,
			cc.type,
			cc.created_by_user_id,
			cc.last_message_id,
			cc.created_at,
			cc.updated_at
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
		WHERE cdc.user_one_id = $1
			AND cdc.user_two_id = $2
			AND cc.type = $3
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		userOneId,
		userTwoId,
		FRIEND_CONVERSATION_TYPE,
	]);
	return rows[0] || null;
}

/**
 * Create a friend direct conversation if one does not already exist.
 *
 * @param {string} userAId
 * @param {string} userBId
 * @returns {Promise<object|null>}
 */
export async function findOrCreateFriendConversation(userAId, userBId) {
	if (!userAId || !userBId || userAId === userBId) {
		return null;
	}

	const existingConversation = await findDirectConversation(userAId, userBId);
	if (existingConversation) {
		return existingConversation;
	}

	const [userOneId, userTwoId] = normalizeDirectPair(userAId, userBId);
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
				RETURNING id, type, created_by_user_id, last_message_id, created_at, updated_at;
			`,
			[FRIEND_CONVERSATION_TYPE, userAId],
		);
		const conversation = conversationRows.rows[0];

		const directRows = await client.query(
			`
				INSERT INTO chat_direct_conversations (
					conversation_id,
					user_one_id,
					user_two_id
				)
				VALUES ($1, $2, $3)
				ON CONFLICT (user_one_id, user_two_id) DO NOTHING
				RETURNING conversation_id;
			`,
			[conversation.id, userOneId, userTwoId],
		);

		if (directRows.rowCount === 0) {
			await client.query(
				'DELETE FROM chat_conversations WHERE id = $1;',
				[conversation.id],
			);
			await client.query('COMMIT');
			return findDirectConversation(userAId, userBId);
		}

		await client.query(
			`
				INSERT INTO chat_conversation_members (
					conversation_id,
					user_id,
					role
				)
				VALUES
					($1, $2, $4),
					($1, $3, $4)
				ON CONFLICT (conversation_id, user_id) DO NOTHING;
			`,
			[conversation.id, userAId, userBId, MEMBER_ROLE],
		);

		await client.query('COMMIT');
		return conversation;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Find friend conversations for one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function findFriendConversationsForUser(userId) {
	const q = `
		SELECT
			cc.id AS conversation_id,
			cc.last_message_id,
			cc.updated_at,
			lm.created_at AS last_message_created_at,
			friend.id AS friend_id,
			friend.username AS friend_username,
			friend.email AS friend_email,
			friend.avatar_seed AS friend_avatar_seed,
			friend.country_code AS friend_country_code
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $2
		INNER JOIN users friend
			ON friend.id = CASE
				WHEN cdc.user_one_id = $1 THEN cdc.user_two_id
				ELSE cdc.user_one_id
			END
		LEFT JOIN chat_messages lm
			ON lm.id = cc.last_message_id
		WHERE (cdc.user_one_id = $1 OR cdc.user_two_id = $1)
			AND cdc.user_one_id <> cdc.user_two_id
			AND EXISTS (
				SELECT 1
				FROM user_follows uf
				WHERE uf.follower_id = $1
					AND uf.followee_id = friend.id
			)
			AND EXISTS (
				SELECT 1
				FROM user_follows uf
				WHERE uf.follower_id = friend.id
					AND uf.followee_id = $1
			)
			AND NOT EXISTS (
				SELECT 1
				FROM user_blocks ub
				WHERE (ub.blocker_id = $1 AND ub.blocked_id = friend.id)
					OR (ub.blocker_id = friend.id AND ub.blocked_id = $1)
			)
		ORDER BY
			(lm.id IS NULL) ASC,
			lm.created_at DESC,
			LOWER(COALESCE(friend.username, friend.email)) ASC;
	`;

	return queryRows(q, [userId, FRIEND_CONVERSATION_TYPE]);
}

/**
 * Check whether one friend conversation is visible to a user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findVisibleFriendConversationForUser(
	conversationId,
	userId,
) {
	const q = `
		SELECT
			cc.id AS conversation_id,
			cc.last_message_id,
			cc.updated_at
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $3
		INNER JOIN users friend
			ON friend.id = CASE
				WHEN cdc.user_one_id = $2 THEN cdc.user_two_id
				ELSE cdc.user_one_id
			END
		WHERE cc.id = $1
			AND (cdc.user_one_id = $2 OR cdc.user_two_id = $2)
			AND cdc.user_one_id <> cdc.user_two_id
			AND EXISTS (
				SELECT 1
				FROM user_follows uf
				WHERE uf.follower_id = $2
					AND uf.followee_id = friend.id
			)
			AND EXISTS (
				SELECT 1
				FROM user_follows uf
				WHERE uf.follower_id = friend.id
					AND uf.followee_id = $2
			)
			AND NOT EXISTS (
				SELECT 1
				FROM user_blocks ub
				WHERE (ub.blocker_id = $2 AND ub.blocked_id = friend.id)
					OR (ub.blocker_id = friend.id AND ub.blocked_id = $2)
			)
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		FRIEND_CONVERSATION_TYPE,
	]);
	return rows[0] || null;
}

/**
 * Find one friend conversation with display data for one user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findFriendConversationForUserById(
	conversationId,
	userId,
) {
	const q = `
		SELECT
			cc.id AS conversation_id,
			cc.last_message_id,
			cc.updated_at,
			lm.created_at AS last_message_created_at,
			friend.id AS friend_id,
			friend.username AS friend_username,
			friend.email AS friend_email,
			friend.avatar_seed AS friend_avatar_seed,
			friend.country_code AS friend_country_code
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $3
		INNER JOIN users friend
			ON friend.id = CASE
				WHEN cdc.user_one_id = $2 THEN cdc.user_two_id
				ELSE cdc.user_one_id
			END
		LEFT JOIN chat_messages lm
			ON lm.id = cc.last_message_id
		WHERE cc.id = $1
			AND (cdc.user_one_id = $2 OR cdc.user_two_id = $2)
			AND cdc.user_one_id <> cdc.user_two_id
			AND EXISTS (
				SELECT 1
				FROM user_follows uf
				WHERE uf.follower_id = $2
					AND uf.followee_id = friend.id
			)
			AND EXISTS (
				SELECT 1
				FROM user_follows uf
				WHERE uf.follower_id = friend.id
					AND uf.followee_id = $2
			)
			AND NOT EXISTS (
				SELECT 1
				FROM user_blocks ub
				WHERE (ub.blocker_id = $2 AND ub.blocked_id = friend.id)
					OR (ub.blocker_id = friend.id AND ub.blocked_id = $2)
			)
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		conversationId,
		userId,
		FRIEND_CONVERSATION_TYPE,
	]);
	return rows[0] || null;
}

export default {
	findDirectConversation,
	findOrCreateFriendConversation,
	findFriendConversationsForUser,
	findVisibleFriendConversationForUser,
	findFriendConversationForUserById,
};
