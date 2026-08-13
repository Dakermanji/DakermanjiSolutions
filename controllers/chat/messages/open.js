//! controllers/chat/messages/open.js

import { findOpenableRoomMessageContext } from '../../../services/chat/messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../../constants/chat.js';
import {
	setActiveChatConversation,
	setFocusedChatMessage,
} from '../session.js';

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
