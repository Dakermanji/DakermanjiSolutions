//! controllers/chat/messages/writes.js

import {
	createFriendMessage,
	createRoomMessage,
	MESSAGE_WRITE_RESULT,
} from '../../../services/chat/messages.js';
import { emitChatMessageCreated } from '../../../services/chat/live.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../../constants/chat.js';
import { getRoomMessageFailureKey } from './utils.js';

export async function createFriendChatMessage(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;

	if (!activeConversationId || !isValidUuid(activeConversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const message = await createFriendMessage({
			conversationId: activeConversationId,
			senderUserId: req.user.id,
			replyToMessageId: req.body?.replyToMessageId,
			body: req.body?.message,
		});

		if (!message) {
			req.flash(
				'error',
				await getRoomMessageFailureKey(activeConversationId, req.user.id),
			);
		} else {
			await emitChatMessageCreated(message);
		}

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

export async function createRoomChatMessage(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;

	if (!activeConversationId || !isValidUuid(activeConversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const message = await createRoomMessage({
			conversationId: activeConversationId,
			senderUserId: req.user.id,
			replyToMessageId: req.body?.replyToMessageId,
			body: req.body?.message,
		});

		if (message?.reason === MESSAGE_WRITE_RESULT.RATE_LIMITED) {
			req.flash('error', 'chat:conversation.rateLimited');
		} else if (!message) {
			req.flash('error', 'chat:conversation.messageError');
		} else {
			await emitChatMessageCreated(message);
		}

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
