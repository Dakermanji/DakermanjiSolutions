//! services/chat/messages/reactions.js

import {
	CHAT_CONVERSATION_TYPES,
	CHAT_MESSAGE_REACTIONS,
} from '../../../constants/chat.js';
import ChatMessagesModel from '../../../models/chat/Messages.js';
import { findReadableChatConversation } from '../authorization.js';
import { findOpenableRoomConversation } from '../rooms.js';
import { formatMessageReactionSummary } from './formatters.js';

const ALLOWED_MESSAGE_REACTIONS = new Set(CHAT_MESSAGE_REACTIONS);

function normalizeReaction(reaction) {
	return String(reaction || '').trim();
}

async function findReadableConversationForReaction({
	kind,
	conversationId,
	userId,
}) {
	if (kind === 'room') {
		return findOpenableRoomConversation(conversationId, userId);
	}

	return findReadableChatConversation({
		conversationId,
		userId,
		type: CHAT_CONVERSATION_TYPES.FRIEND,
	});
}

async function getMessageReactionSummary({
	messageId,
	viewerUserId,
}) {
	const reactions = await ChatMessagesModel.listMessageReactions({
		messageIds: [messageId],
		viewerUserId,
	});

	return formatMessageReactionSummary({
		messageId,
		reactions,
		viewerUserId,
	});
}

/**
 * List grouped reactions for one visible message.
 *
 * @param {object} input
 * @param {'friend'|'room'} input.kind
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.viewerUserId
 * @returns {Promise<object|null>}
 */
export async function listMessageReactionSummary({
	kind,
	conversationId,
	messageId,
	viewerUserId,
}) {
	const conversation = await findReadableConversationForReaction({
		kind,
		conversationId,
		userId: viewerUserId,
	});

	if (!conversation) {
		return null;
	}

	const message = await ChatMessagesModel.findConversationMessageById({
		conversationId: conversation.conversation_id,
		messageId,
	});

	if (!message) {
		return null;
	}

	return getMessageReactionSummary({
		messageId: message.id,
		viewerUserId,
	});
}

/**
 * Toggle one allowed reaction on one visible message.
 *
 * @param {object} input
 * @param {'friend'|'room'} input.kind
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.userId
 * @param {string} input.reaction
 * @returns {Promise<object|null>}
 */
export async function toggleMessageReaction({
	kind,
	conversationId,
	messageId,
	userId,
	reaction,
}) {
	const normalizedReaction = normalizeReaction(reaction);

	if (!ALLOWED_MESSAGE_REACTIONS.has(normalizedReaction)) {
		return null;
	}

	const conversation = await findReadableConversationForReaction({
		kind,
		conversationId,
		userId,
	});

	if (!conversation) {
		return null;
	}

	const message = await ChatMessagesModel.findConversationMessageById({
		conversationId: conversation.conversation_id,
		messageId,
	});

	if (!message) {
		return null;
	}

	const mutation = await ChatMessagesModel.toggleMessageReaction({
		messageId: message.id,
		userId,
		reaction: normalizedReaction,
	});

	const summary = await getMessageReactionSummary({
		messageId: message.id,
		viewerUserId: userId,
	});

	return {
		...summary,
		action: mutation.action,
		reaction: normalizedReaction,
	};
}
