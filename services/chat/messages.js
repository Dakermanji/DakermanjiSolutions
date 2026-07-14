//! services/chat/messages.js

import ChatMessagesModel from '../../models/chat/Messages.js';
import ChatConversationsModel from '../../models/chat/Conversations.js';

const MESSAGE_BODY_MAX_LENGTH = 2000;
const RECENT_MESSAGE_LIMIT = 50;

function normalizeMessageBody(body) {
	return String(body || '').trim();
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
		sender: {
			id: message.sender_user_id,
			username: message.sender_username,
			email: message.sender_email,
		},
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

	if (!normalizedBody || normalizedBody.length > MESSAGE_BODY_MAX_LENGTH) {
		return null;
	}

	const conversation =
		await ChatConversationsModel.findVisibleFriendConversationForUser(
			conversationId,
			senderUserId,
		);

	if (!conversation) {
		return null;
	}

	return ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		body: normalizedBody,
	});
}

/**
 * List recent messages for an openable friend conversation.
 *
 * @param {string} conversationId
 * @param {string} viewerUserId
 * @returns {Promise<Array>}
 */
export async function listFriendMessages(conversationId, viewerUserId) {
	const conversation =
		await ChatConversationsModel.findVisibleFriendConversationForUser(
			conversationId,
			viewerUserId,
		);

	if (!conversation) {
		return [];
	}

	const messages = await ChatMessagesModel.findRecentConversationMessages(
		conversation.conversation_id,
		RECENT_MESSAGE_LIMIT,
	);

	return messages.map((message) => formatMessage(message, viewerUserId));
}

export { MESSAGE_BODY_MAX_LENGTH, RECENT_MESSAGE_LIMIT };

export default {
	createFriendMessage,
	listFriendMessages,
};
