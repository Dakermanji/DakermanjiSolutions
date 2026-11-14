//! services/chat/messages/writes.js

import ChatMessagesModel from '../../../models/chat/Messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import {
	CHAT_CONVERSATION_TYPES,
	CHAT_MESSAGE_MODERATION_STATUSES,
} from '../../../constants/chat.js';
import { findWritableChatConversation } from '../authorization.js';
import { findWritableRoomConversation } from '../rooms.js';
import { canChatMemberManage } from '../rooms/permissions.js';
import { formatLiveMessage } from './formatters.js';
import { extractMessageMentionUsernames } from './mentions.js';
import {
	notifyMessageMentions,
	notifyMessageReply,
} from './notifications.js';
import { getMessageSafetyDecision } from './safety.js';
import { checkRoomMessageRateLimit } from './rateLimit.js';
import {
	MESSAGE_BODY_MAX_LENGTH,
	normalizeMessageBody,
	resolveReplyToMessageId,
} from './utils.js';

export const MESSAGE_WRITE_RESULT = Object.freeze({
	INVALID: 'invalid',
	RATE_LIMITED: 'rate_limited',
});


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
	clientMessageId = null,
	replyToMessageId = null,
	body,
}) {
	if (clientMessageId && !isValidUuid(clientMessageId)) return null;
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

	const result = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		clientMessageId,
		replyToMessageId: reply.replyToMessageId,
		mentionedUserIds,
		body: normalizedBody,
	});

	if (!result) return null;
	const formattedMessage = formatLiveMessage(result.message);
	if (result.created) {
		await notifyMessageNotifications({
			message: formattedMessage,
			senderUserId,
		});
	}

	return { message: formattedMessage, created: result.created };
}

/**
 * Create a notes message when the user owns the self conversation.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.senderUserId
 * @param {string|null} [input.replyToMessageId]
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function createNotesMessage({
	conversationId,
	senderUserId,
	clientMessageId = null,
	replyToMessageId = null,
	body,
}) {
	if (clientMessageId && !isValidUuid(clientMessageId)) return null;
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > MESSAGE_BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableChatConversation({
		conversationId,
		userId: senderUserId,
		type: CHAT_CONVERSATION_TYPES.SELF,
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

	const result = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		clientMessageId,
		replyToMessageId: reply.replyToMessageId,
		mentionedUserIds: [],
		body: normalizedBody,
	});

	return result && { message: formatLiveMessage(result.message), created: result.created };
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
	clientMessageId = null,
	replyToMessageId = null,
	body,
}) {
	if (clientMessageId && !isValidUuid(clientMessageId)) return null;
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

	const existing = clientMessageId && await ChatMessagesModel.findConversationMessageById({
		conversationId: conversation.conversation_id,
		messageId: clientMessageId,
		viewerUserId: senderUserId,
	});
	const rateLimit = existing ? { ok: true } : checkRoomMessageRateLimit({
		conversation,
		senderUserId,
	});

	if (!rateLimit.ok) {
		return {
			ok: false,
			reason: MESSAGE_WRITE_RESULT.RATE_LIMITED,
			retryAfterMs: rateLimit.retryAfterMs || 0,
		};
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

	const safetyDecision = getRoomMessageSafetyDecision({
		body: normalizedBody,
		conversation,
	});

	const result = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		clientMessageId,
		replyToMessageId: reply.replyToMessageId,
		mentionedUserIds,
		body: normalizedBody,
		moderationStatus: safetyDecision.moderationStatus,
		moderationReason: safetyDecision.moderationReason,
	});

	if (!result) return null;
	const formattedMessage = formatLiveMessage(result.message);

	if (result.created && !formattedMessage.isPendingReview) {
		await notifyMessageNotifications({
			message: formattedMessage,
			senderUserId,
		});
	}

	return { message: formattedMessage, created: result.created };
}

async function notifyMessageNotifications({ message, senderUserId }) {
	await Promise.all([
		notifyMessageMentions({ message, senderUserId }),
		notifyMessageReply({ message, senderUserId }),
	]);
}

function getRoomMessageSafetyDecision({ body, conversation }) {
	if (
		canChatMemberManage(
			conversation.member_role,
			conversation.member_status,
		)
	) {
		return {
			moderationStatus: CHAT_MESSAGE_MODERATION_STATUSES.VISIBLE,
			moderationReason: null,
		};
	}

	return getMessageSafetyDecision({
		body,
		conversationType: conversation.conversation_type,
	});
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
