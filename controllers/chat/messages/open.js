//! controllers/chat/messages/open.js

import {
	findOpenableChatMessageContext,
	findOpenableRoomMessageContext,
} from '../../../services/chat/messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../../constants/chat.js';
import { NOTIFICATIONS_REDIRECT } from '../../../constants/notifications.js';
import {
	setActiveChatConversation,
	setFocusedChatMessage,
} from '../session.js';

export async function openChatMessage(req, res, next) {
	const conversationId = String(req.params?.conversationId || '').trim();
	const messageId = String(req.params?.messageId || '').trim();

	if (!isValidUuid(conversationId) || !isValidUuid(messageId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const message = await findOpenableChatMessageContext({
			conversationId,
			messageId,
			viewerUserId: req.user.id,
		});

		if (!message) {
			req.flash('error', 'notifications:actions.noLongerAvailable');
			return res.redirect(NOTIFICATIONS_REDIRECT);
		}

		setActiveChatConversation(req, conversationId);
		setFocusedChatMessage(req, messageId);

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

export async function openRoomChatMessage(req, res, next) {
	const conversationId = String(req.body?.conversationId || '').trim();
	const messageId = String(req.body?.messageId || '').trim();

	if (!isValidUuid(conversationId) || !isValidUuid(messageId)) {
		req.flash('error', 'chat:rooms.openError');
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const message = await findOpenableRoomMessageContext({
			conversationId,
			messageId,
			viewerUserId: req.user.id,
		});

		if (!message) {
			req.flash('error', 'chat:rooms.openError');
			return res.redirect(CHAT_REDIRECT);
		}

		setActiveChatConversation(req, conversationId);
		setFocusedChatMessage(req, messageId);

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
