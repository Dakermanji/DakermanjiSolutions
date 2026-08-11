//! services/chat/messages/utils.js

import { CHAT_MESSAGE_LIMITS } from '../../../constants/chat.js';
import ChatMessagesModel from '../../../models/chat/Messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';

export const MESSAGE_BODY_MAX_LENGTH = CHAT_MESSAGE_LIMITS.BODY_MAX_LENGTH;
export const MESSAGE_PAGE_LIMIT = CHAT_MESSAGE_LIMITS.OLDER_PAGE_SIZE;
export const RECENT_MESSAGE_LIMIT = CHAT_MESSAGE_LIMITS.RECENT_PAGE_SIZE;

export function normalizeMessageBody(body) {
	return String(body || '').trim();
}

export function getMutationWindowMs(kind) {
	return kind === 'room'
		? CHAT_MESSAGE_LIMITS.ROOM_EDIT_DELETE_WINDOW_MS
		: CHAT_MESSAGE_LIMITS.FRIEND_EDIT_DELETE_WINDOW_MS;
}

export async function resolveReplyToMessageId({
	conversationId,
	replyToMessageId,
}) {
	const normalizedReplyToMessageId = String(replyToMessageId || '').trim();

	if (!normalizedReplyToMessageId) {
		return {
			ok: true,
			replyToMessageId: null,
		};
	}

	if (!isValidUuid(normalizedReplyToMessageId)) {
		return {
			ok: false,
			replyToMessageId: null,
		};
	}

	const replyTarget =
		await ChatMessagesModel.findReplyableConversationMessage({
			conversationId,
			messageId: normalizedReplyToMessageId,
		});

	return {
		ok: Boolean(replyTarget),
		replyToMessageId: replyTarget?.id || null,
	};
}
