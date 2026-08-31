//! services/chat/messages/reads.js

import ChatMessagesModel from '../../../models/chat/Messages.js';
import { findReadableChatConversation } from '../authorization.js';
import { findOpenableRoomConversation } from '../rooms.js';
import { canChatMemberManage } from '../rooms/permissions.js';
import { emptyMessagePage, formatMessagePage } from './pagination.js';
import { MESSAGE_PAGE_LIMIT, RECENT_MESSAGE_LIMIT } from './utils.js';

/**
 * Check whether a user can open one friend conversation.
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
 * List recent messages for an openable friend conversation.
 *
 * @param {string} conversationId
 * @param {string} viewerUserId
 * @returns {Promise<object>}
 */
export async function listFriendMessages(conversationId, viewerUserId) {
	const conversation = await findReadableChatConversation({
		conversationId,
		userId: viewerUserId,
	});

	if (!conversation) {
		return emptyMessagePage();
	}

	const messages = await ChatMessagesModel.findRecentConversationMessages(
		conversation.conversation_id,
		RECENT_MESSAGE_LIMIT + 1,
		viewerUserId,
	);

	return formatMessagePage(
		messages,
		viewerUserId,
		RECENT_MESSAGE_LIMIT,
		'friend',
	);
}

/**
 * List recent messages for an openable room conversation.
 *
 * @param {string} conversationId
 * @param {string} viewerUserId
 * @returns {Promise<object>}
 */
export async function listRoomMessages(conversationId, viewerUserId) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (!conversation) {
		return emptyMessagePage();
	}

	const messages = await ChatMessagesModel.findRecentConversationMessages(
		conversation.conversation_id,
		RECENT_MESSAGE_LIMIT + 1,
		viewerUserId,
		canChatMemberManage(
			conversation.member_role,
			conversation.member_status,
		),
	);

	return formatMessagePage(
		messages,
		viewerUserId,
		RECENT_MESSAGE_LIMIT,
		'room',
	);
}

/**
 * List older messages for an openable friend conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.viewerUserId
 * @param {string} params.beforeId
 * @returns {Promise<object|null>}
 */
export async function listOlderFriendMessages({
	conversationId,
	viewerUserId,
	beforeId,
}) {
	const conversation = await findReadableChatConversation({
		conversationId,
		userId: viewerUserId,
	});

	if (!conversation) {
		return null;
	}

	const messages = await ChatMessagesModel.findOlderConversationMessages({
		conversationId: conversation.conversation_id,
		beforeId,
		limit: MESSAGE_PAGE_LIMIT + 1,
		viewerUserId,
	});

	return formatMessagePage(
		messages,
		viewerUserId,
		MESSAGE_PAGE_LIMIT,
		'friend',
	);
}

/**
 * List older messages for an openable room conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.viewerUserId
 * @param {string} params.beforeId
 * @returns {Promise<object|null>}
 */
export async function listOlderRoomMessages({
	conversationId,
	viewerUserId,
	beforeId,
}) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (!conversation) {
		return null;
	}

	const messages = await ChatMessagesModel.findOlderConversationMessages({
		conversationId: conversation.conversation_id,
		beforeId,
		limit: MESSAGE_PAGE_LIMIT + 1,
		viewerUserId,
		canViewPendingModeration: canChatMemberManage(
			conversation.member_role,
			conversation.member_status,
		),
	});

	return formatMessagePage(
		messages,
		viewerUserId,
		MESSAGE_PAGE_LIMIT,
		'room',
	);
}

/**
 * Check whether a room message can be opened by one user.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.viewerUserId
 * @returns {Promise<object|null>}
 */
export async function findOpenableRoomMessageContext({
	conversationId,
	messageId,
	viewerUserId,
}) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (!conversation) {
		return null;
	}

	return ChatMessagesModel.findConversationMessageById({
		conversationId: conversation.conversation_id,
		messageId,
	});
}
