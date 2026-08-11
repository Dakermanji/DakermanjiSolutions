//! services/chat/messages/mutations.js

import ChatMessagesModel from '../../../models/chat/Messages.js';
import { findWritableChatConversation } from '../authorization.js';
import { findWritableRoomConversation } from '../rooms.js';
import { formatMessage } from './formatters.js';
import {
	MESSAGE_BODY_MAX_LENGTH,
	getMutationWindowMs,
	normalizeMessageBody,
} from './utils.js';

async function findWritableConversationForMutation({
	kind,
	conversationId,
	userId,
}) {
	if (kind === 'room') {
		return findWritableRoomConversation(conversationId, userId);
	}

	return findWritableChatConversation({
		conversationId,
		userId,
	});
}

/**
 * Edit one sender-owned message inside the active mutation window.
 *
 * @param {object} input
 * @param {'friend'|'room'} input.kind
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.senderUserId
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function editOwnMessage({
	kind,
	conversationId,
	messageId,
	senderUserId,
	body,
}) {
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > MESSAGE_BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableConversationForMutation({
		kind,
		conversationId,
		userId: senderUserId,
	});

	if (!conversation) {
		return null;
	}

	const message = await ChatMessagesModel.updateOwnConversationMessage({
		conversationId: conversation.conversation_id,
		messageId,
		senderUserId,
		body: normalizedBody,
		windowMs: getMutationWindowMs(kind),
	});

	return message ? formatMessage(message, senderUserId) : null;
}

/**
 * Delete one sender-owned message inside the active mutation window.
 *
 * @param {object} input
 * @param {'friend'|'room'} input.kind
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.senderUserId
 * @returns {Promise<object|null>}
 */
export async function deleteOwnMessage({
	kind,
	conversationId,
	messageId,
	senderUserId,
}) {
	const conversation = await findWritableConversationForMutation({
		kind,
		conversationId,
		userId: senderUserId,
	});

	if (!conversation) {
		return null;
	}

	return ChatMessagesModel.deleteOwnConversationMessage({
		conversationId: conversation.conversation_id,
		messageId,
		senderUserId,
		windowMs: getMutationWindowMs(kind),
	});
}
