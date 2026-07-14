//! services/chat/messages.js

import ChatMessagesModel from '../../models/chat/Messages.js';
import { CHAT_MESSAGE_LIMITS } from '../../constants/chat.js';
import {
	findReadableChatConversation,
	findWritableChatConversation,
} from './authorization.js';
import { getUserAvatarProfile } from '../avatar/dicebear.js';

const { BODY_MAX_LENGTH, OLDER_PAGE_SIZE, RECENT_PAGE_SIZE } =
	CHAT_MESSAGE_LIMITS;

function normalizeMessageBody(body) {
	return String(body || '').trim();
}

function formatMessageSender(message) {
	const displayName =
		message.sender_username ||
		message.sender_email ||
		'User';
	const avatar = getUserAvatarProfile(
		message.sender_avatar_seed || displayName,
	);

	return {
		id: message.sender_user_id,
		username: message.sender_username,
		email: message.sender_email,
		displayName,
		countryCode: message.sender_country_code,
		avatar: {
			src: avatar.src,
			background: avatar.background,
		},
	};
}

function formatMessage(message, viewerUserId) {
	return {
		id: message.id,
		conversationId: message.conversation_id,
		body: message.body,
		createdAt: message.created_at,
		updatedAt: message.updated_at,
		editedAt: message.edited_at,
		isMine: message.sender_user_id === viewerUserId,
		sender: formatMessageSender(message),
	};
}

function formatLiveMessage(message) {
	return {
		id: message.id,
		conversationId: message.conversation_id,
		body: message.body,
		createdAt: message.created_at,
		updatedAt: message.updated_at,
		editedAt: message.edited_at,
		sender: formatMessageSender(message),
	};
}

function formatMessagePage(messages, viewerUserId, limit) {
	const hasMore = messages.length > limit;
	const pageMessages = hasMore ? messages.slice(1) : messages;

	return {
		hasMore,
		messages: pageMessages.map((message) =>
			formatMessage(message, viewerUserId),
		),
	};
}

function emptyMessagePage() {
	return {
		hasMore: false,
		messages: [],
	};
}

/**
 * Create a friend chat message when the user still has write access.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.senderUserId
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function createFriendMessage({
	conversationId,
	senderUserId,
	body,
}) {
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableChatConversation({
		conversationId,
		userId: senderUserId,
	});

	if (!conversation) {
		return null;
	}

	const message = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		body: normalizedBody,
	});

	return formatLiveMessage(message);
}

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
		RECENT_PAGE_SIZE + 1,
	);

	return formatMessagePage(messages, viewerUserId, RECENT_PAGE_SIZE);
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
		limit: OLDER_PAGE_SIZE + 1,
	});

	return formatMessagePage(messages, viewerUserId, OLDER_PAGE_SIZE);
}

export const MESSAGE_BODY_MAX_LENGTH = BODY_MAX_LENGTH;
export const MESSAGE_PAGE_LIMIT = OLDER_PAGE_SIZE;
export const RECENT_MESSAGE_LIMIT = RECENT_PAGE_SIZE;

export default {
	createFriendMessage,
	findOpenableFriendConversation,
	listOlderFriendMessages,
	listFriendMessages,
};
