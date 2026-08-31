//! services/chat/messages/writes.js

import ChatMessagesModel from '../../../models/chat/Messages.js';
import { findWritableChatConversation } from '../authorization.js';
import { findWritableRoomConversation } from '../rooms.js';
import { formatLiveMessage } from './formatters.js';
import { extractMessageMentionUsernames } from './mentions.js';
import { notifyMessageMentions } from './notifications.js';
import { getMessageSafetyDecision } from './safety.js';
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

	const mentionedUserIds = await resolveMentionedUserIds({
		conversationId: conversation.conversation_id,
		body: normalizedBody,
	});

	const message = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		replyToMessageId: reply.replyToMessageId,
		mentionedUserIds,
		body: normalizedBody,
	});

	const formattedMessage = formatLiveMessage(message);

	await notifyMessageMentions({
		message: formattedMessage,
		senderUserId,
		kind: 'friend',
	});

	return formattedMessage;
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

	const mentionedUserIds = await resolveMentionedUserIds({
		conversationId: conversation.conversation_id,
		body: normalizedBody,
	});

	const safetyDecision = getMessageSafetyDecision({
		body: normalizedBody,
		conversationType: conversation.conversation_type,
	});

	const message = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		replyToMessageId: reply.replyToMessageId,
		mentionedUserIds,
		body: normalizedBody,
		moderationStatus: safetyDecision.moderationStatus,
		moderationReason: safetyDecision.moderationReason,
	});

	const formattedMessage = formatLiveMessage(message);

	if (!formattedMessage.isPendingReview) {
		await notifyMessageMentions({
			message: formattedMessage,
			senderUserId,
			kind: 'room',
		});
	}

	return formattedMessage;
}

async function resolveMentionedUserIds({
	conversationId,
	body,
}) {
	const usernames = extractMessageMentionUsernames(body);
	if (usernames.length === 0) return [];

	const users = await ChatMessagesModel.findMentionableConversationUsersByUsernames({
		conversationId,
		usernames,
	});

	return users.map((user) => user.id);
}
