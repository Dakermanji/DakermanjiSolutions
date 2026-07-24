//! models/chat/conversations/friends.js

import { queryRows } from '../../../config/database.js';
import { CHAT_CONVERSATION_TYPES } from '../../../constants/chat.js';

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
			ccm.last_read_message_id,
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
			) AS unread_count,
			friend.id AS friend_id,
			friend.username AS friend_username,
			friend.email AS friend_email,
			friend.avatar_seed AS friend_avatar_seed,
			friend.country_code AS friend_country_code
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $2
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
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

	return queryRows(q, [userId, CHAT_CONVERSATION_TYPES.FRIEND]);
}

/**
 * Count unread friend messages for one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countUnreadFriendMessagesForUser(userId) {
	const q = `
		SELECT COUNT(unread_messages.id)::int AS unread_count
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $2
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
		INNER JOIN users friend
			ON friend.id = CASE
				WHEN cdc.user_one_id = $1 THEN cdc.user_two_id
				ELSE cdc.user_one_id
			END
		INNER JOIN chat_messages unread_messages
			ON unread_messages.conversation_id = cc.id
			AND unread_messages.sender_user_id <> $1
			AND unread_messages.deleted_at IS NULL
		LEFT JOIN chat_messages read_message
			ON read_message.id = ccm.last_read_message_id
		WHERE (cdc.user_one_id = $1 OR cdc.user_two_id = $1)
			AND cdc.user_one_id <> cdc.user_two_id
			AND (
				ccm.last_read_message_id IS NULL
				OR unread_messages.created_at > read_message.created_at
				OR (
					unread_messages.created_at = read_message.created_at
					AND unread_messages.id > read_message.id
				)
			)
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
			);
	`;

	const rows = await queryRows(q, [userId, CHAT_CONVERSATION_TYPES.FRIEND]);
	return rows[0]?.unread_count || 0;
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
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $2
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
		CHAT_CONVERSATION_TYPES.FRIEND,
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
			ccm.last_read_message_id,
			(
				SELECT COUNT(*)::int
				FROM chat_messages unread_messages
				LEFT JOIN chat_messages read_message
					ON read_message.id = ccm.last_read_message_id
				WHERE unread_messages.conversation_id = cc.id
					AND unread_messages.sender_user_id <> $2
					AND unread_messages.deleted_at IS NULL
					AND (
						ccm.last_read_message_id IS NULL
						OR unread_messages.created_at > read_message.created_at
						OR (
							unread_messages.created_at = read_message.created_at
							AND unread_messages.id > read_message.id
						)
					)
			) AS unread_count,
			friend.id AS friend_id,
			friend.username AS friend_username,
			friend.email AS friend_email,
			friend.avatar_seed AS friend_avatar_seed,
			friend.country_code AS friend_country_code
		FROM chat_direct_conversations cdc
		INNER JOIN chat_conversations cc
			ON cc.id = cdc.conversation_id
			AND cc.type = $3
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $2
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
		CHAT_CONVERSATION_TYPES.FRIEND,
	]);
	return rows[0] || null;
}

