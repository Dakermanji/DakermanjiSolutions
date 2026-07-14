//! services/chat/friends.js

import ChatConversationsModel from '../../models/chat/Conversations.js';
import ChatConversationMembersModel from '../../models/chat/ConversationMembers.js';
import UserBlocksModel from '../../models/social/Blocks.js';
import UserFollowsModel from '../../models/social/Follows.js';
import { getUserAvatarProfile } from '../avatar/dicebear.js';
import { findReadableChatConversation } from './authorization.js';

function formatFriendConversation(conversation) {
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
			lastReadMessageId: conversation.last_read_message_id,
			unreadCount: Number(conversation.unread_count || 0),
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
}

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

	return conversations.map(formatFriendConversation);
}

/**
 * Count unread friend chat messages for one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export function countUnreadFriendMessages(userId) {
	return ChatConversationsModel.countUnreadFriendMessagesForUser(userId);
}

/**
 * Check whether one friend conversation can be opened by a user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export function findOpenableFriendConversation(conversationId, userId) {
	return findReadableChatConversation({
		conversationId,
		userId,
	});
}

/**
 * Find one openable friend conversation with display data.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getOpenFriendConversation(conversationId, userId) {
	const readableConversation = await findReadableChatConversation({
		conversationId,
		userId,
	});

	if (!readableConversation) {
		return null;
	}

	const conversation =
		await ChatConversationsModel.findFriendConversationForUserById(
			conversationId,
			userId,
		);

	return conversation ? formatFriendConversation(conversation) : null;
}

/**
 * Mark an openable friend conversation read through its latest message.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function markFriendConversationRead(conversationId, userId) {
	const conversation = await findReadableChatConversation({
		conversationId,
		userId,
	});

	if (!conversation) {
		return null;
	}

	return ChatConversationMembersModel.markReadThroughLatestMessage(
		conversation.conversation_id,
		userId,
	);
}
