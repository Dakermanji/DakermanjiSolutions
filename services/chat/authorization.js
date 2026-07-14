//! services/chat/authorization.js

import ChatConversationsModel from '../../models/chat/Conversations.js';
import { CHAT_CONVERSATION_TYPES } from '../../constants/chat.js';

async function findReadableFriendConversation(conversationId, userId) {
	return ChatConversationsModel.findVisibleFriendConversationForUser(
		conversationId,
		userId,
	);
}

async function findWritableFriendConversation(conversationId, userId) {
	return findReadableFriendConversation(conversationId, userId);
}

/**
 * Find a conversation the user can read.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @param {string} [input.type]
 * @returns {Promise<object|null>}
 */
export async function findReadableChatConversation({
	conversationId,
	userId,
	type = CHAT_CONVERSATION_TYPES.FRIEND,
}) {
	if (type === CHAT_CONVERSATION_TYPES.FRIEND) {
		return findReadableFriendConversation(conversationId, userId);
	}

	return null;
}

/**
 * Find a conversation the user can write to.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @param {string} [input.type]
 * @returns {Promise<object|null>}
 */
export async function findWritableChatConversation({
	conversationId,
	userId,
	type = CHAT_CONVERSATION_TYPES.FRIEND,
}) {
	if (type === CHAT_CONVERSATION_TYPES.FRIEND) {
		return findWritableFriendConversation(conversationId, userId);
	}

	return null;
}

/**
 * Check whether a user can read a conversation.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @param {string} [input.type]
 * @returns {Promise<boolean>}
 */
export async function canReadChatConversation(input) {
	return Boolean(await findReadableChatConversation(input));
}

/**
 * Check whether a user can write to a conversation.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @param {string} [input.type]
 * @returns {Promise<boolean>}
 */
export async function canWriteChatConversation(input) {
	return Boolean(await findWritableChatConversation(input));
}

/**
 * Check whether a user can manage a conversation.
 *
 * @returns {Promise<boolean>}
 */
export async function canManageChatConversation() {
	return false;
}

export default {
	canManageChatConversation,
	canReadChatConversation,
	canWriteChatConversation,
	findReadableChatConversation,
	findWritableChatConversation,
};
