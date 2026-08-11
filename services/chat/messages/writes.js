//! services/chat/messages/writes.js

import ChatMessagesModel from '../../../models/chat/Messages.js';
import { findWritableChatConversation } from '../authorization.js';
import { findWritableRoomConversation } from '../rooms.js';
import { formatLiveMessage } from './formatters.js';
import {
	MESSAGE_BODY_MAX_LENGTH,
	normalizeMessageBody,
	resolveReplyToMessageId,
} from './utils.js';

/**
 * Create a friend chat message when the user still has write access.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.senderUserId
 * @param {string|null} [input.replyToMessageId]
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function createFriendMessage({
	conversationId,
	senderUserId,
	replyToMessageId = null,
	body,
}) {
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > MESSAGE_BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableChatConversation({
		conversationId,
		userId: senderUserId,
	});

	if (!conversation) {
		return null;
	}

	const reply = await resolveReplyToMessageId({
		conversationId: conversation.conversation_id,
		replyToMessageId,
	});

	if (!reply.ok) {
		return null;
	}

	const message = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		replyToMessageId: reply.replyToMessageId,
		body: normalizedBody,
	});

	return formatLiveMessage(message);
}

/**
 * Create a room chat message when the user can write in the room.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.senderUserId
 * @param {string|null} [input.replyToMessageId]
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function createRoomMessage({
	conversationId,
	senderUserId,
	replyToMessageId = null,
	body,
}) {
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > MESSAGE_BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableRoomConversation(
		conversationId,
		senderUserId,
	);

	if (!conversation) {
		return null;
	}

	const reply = await resolveReplyToMessageId({
		conversationId: conversation.conversation_id,
		replyToMessageId,
	});

	if (!reply.ok) {
		return null;
	}

	const message = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		replyToMessageId: reply.replyToMessageId,
		body: normalizedBody,
	});

	return formatLiveMessage(message);
}
