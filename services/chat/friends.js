//! services/chat/friends.js

import ChatConversationsModel from '../../models/ChatConversations.js';
import UserBlocksModel from '../../models/UserBlocks.js';
import UserFollowsModel from '../../models/UserFollows.js';
import { getUserAvatarProfile } from '../avatar/dicebear.js';

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
export async function listFriendConversations(userId) {
	const conversations =
		await ChatConversationsModel.findFriendConversationsForUser(userId);

	return conversations.map((conversation) => {
		const friendName =
			conversation.friend_username || conversation.friend_email || '';
		const avatar = getUserAvatarProfile(
			conversation.friend_avatar_seed || friendName || 'friend',
		);

		return {
			conversation: {
				id: conversation.conversation_id,
				lastMessageId: conversation.last_message_id,
				lastMessageCreatedAt: conversation.last_message_created_at,
				updatedAt: conversation.updated_at,
			},
			friend: {
				id: conversation.friend_id,
				username: conversation.friend_username,
				email: conversation.friend_email,
				countryCode: conversation.friend_country_code,
				avatar: {
					src: avatar.src,
					background: avatar.background,
				},
			},
		};
	});
}
