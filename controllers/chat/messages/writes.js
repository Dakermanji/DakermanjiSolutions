//! controllers/chat/messages/writes.js

import {
	createFriendMessage,
	createNotesMessage,
	createRoomMessage,
	MESSAGE_WRITE_RESULT,
} from '../../../services/chat/messages.js';
import { emitChatMessageCreated } from '../../../services/chat/live.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../../constants/chat.js';
import { getMessageRedirect, getRequestConversationId, getRoomMessageFailureKey } from './utils.js';

export async function createFriendChatMessage(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;

	if (!activeConversationId || !isValidUuid(activeConversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const result = await createFriendMessage({
			conversationId: activeConversationId,
			senderUserId: req.user.id,
			clientMessageId: req.body?.clientMessageId,
			replyToMessageId: req.body?.replyToMessageId,
			body: req.body?.message,
		});

		if (!result) {
			req.flash(
				'error',
				await getRoomMessageFailureKey(activeConversationId, req.user.id),
			);
		} else if (result.created) {
			await emitChatMessageCreated(result.message);
		}

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

export async function createNotesChatMessage(req, res, next) {
	const activeConversationId = getRequestConversationId(req, 'self');

	if (!activeConversationId || !isValidUuid(activeConversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const result = await createNotesMessage({
			conversationId: activeConversationId,
			senderUserId: req.user.id,
			clientMessageId: req.body?.clientMessageId,
			replyToMessageId: req.body?.replyToMessageId,
			body: req.body?.message,
		});

		if (!result) {
			req.flash('error', 'chat:conversation.messageError');
		} else if (result.created) {
			await emitChatMessageCreated(result.message, {
				targetUserId: req.user.id,
			});
		}

		return res.redirect(getMessageRedirect('self', activeConversationId));
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
		const result = await createRoomMessage({
			conversationId: activeConversationId,
			senderUserId: req.user.id,
			clientMessageId: req.body?.clientMessageId,
			replyToMessageId: req.body?.replyToMessageId,
			body: req.body?.message,
		});

		if (result?.reason === MESSAGE_WRITE_RESULT.RATE_LIMITED) {
			req.flash('error', 'chat:conversation.rateLimited');
		} else if (!result) {
			req.flash('error', 'chat:conversation.messageError');
		} else if (result.created) {
			await emitChatMessageCreated(result.message);
		}

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
