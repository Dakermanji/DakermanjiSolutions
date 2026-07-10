//! services/chat/messages.js

import ChatMessagesModel from '../../models/ChatMessages.js';
import ChatConversationsModel from '../../models/ChatConversations.js';

const MESSAGE_BODY_MAX_LENGTH = 2000;

function normalizeMessageBody(body) {
	return String(body || '').trim();
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

export { MESSAGE_BODY_MAX_LENGTH };

export default {
	createFriendMessage,
};
