//! controllers/chat/messages/flags.js

import { flagRoomMessage } from '../../../services/chat/messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT } from '../../../constants/chat.js';
import { wantsJson } from './utils.js';

export async function flagRoomChatMessage(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;
	const messageId = String(req.body?.messageId || '').trim();

	if (
		!activeConversationId ||
		!isValidUuid(activeConversationId) ||
		!isValidUuid(messageId)
	) {
		if (wantsJson(req)) {
			return res.status(400).json({
				ok: false,
			});
		}

		req.flash('error', 'chat:conversation.flagError');
		return res.redirect(CHAT_OPEN_REDIRECT);
	}

	try {
		const flag = await flagRoomMessage({
			conversationId: activeConversationId,
			messageId,
			flaggedByUserId: req.user.id,
		});

		if (wantsJson(req)) {
			return res.status(flag ? 200 : 400).json({
				ok: Boolean(flag),
				messageId,
				flagged: Boolean(flag),
			});
		}

		if (!flag) {
			req.flash('error', 'chat:conversation.flagError');
		} else {
			req.flash('success', 'chat:conversation.flagSuccess');
		}

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
