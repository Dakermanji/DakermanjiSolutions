//! services/chat/friends.js

import ChatConversationsModel from '../../models/ChatConversations.js';
import UserBlocksModel from '../../models/UserBlocks.js';
import UserFollowsModel from '../../models/UserFollows.js';

/**
 * Ensure a friend chat exists only when two users mutually follow each other.
 *
 * @param {string} userAId
 * @param {string} userBId
 * @returns {Promise<object|null>}
 */
export async function ensureFriendConversationIfMutual(userAId, userBId) {
	if (!userAId || !userBId || userAId === userBId) {
		return null;
	}

	const usersBlocked =
		(await UserBlocksModel.exists(userAId, userBId)) ||
		(await UserBlocksModel.exists(userBId, userAId));
	if (usersBlocked) {
		return null;
	}

	const isMutual =
		(await UserFollowsModel.exists(userAId, userBId)) &&
		(await UserFollowsModel.exists(userBId, userAId));
	if (!isMutual) {
		return null;
	}

	return ChatConversationsModel.findOrCreateFriendConversation(
		userAId,
		userBId,
	);
}

/**
 * List friend chats visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export function listFriendConversations(userId) {
	return ChatConversationsModel.findFriendConversationsForUser(userId);
}
