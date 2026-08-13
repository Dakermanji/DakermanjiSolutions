//! controllers/chat/messages/reactions.js

import { toggleMessageReaction } from '../../../services/chat/messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT } from '../../../constants/chat.js';
import { wantsJson } from './utils.js';

function getActiveReactionInput(req) {
	return {
		conversationId: req.session.chat?.activeConversationId || null,
		messageId: String(req.body?.messageId || '').trim(),
		reaction: String(req.body?.reaction || '').trim(),
	};
}

function createMessageReactionHandler(kind) {
	return async function reactToChatMessage(req, res, next) {
		const input = getActiveReactionInput(req);

		if (
			!input.conversationId ||
			!isValidUuid(input.conversationId) ||
			!isValidUuid(input.messageId) ||
			!input.reaction
		) {
			if (wantsJson(req)) {
				return res.status(400).json({
					ok: false,
				});
			}

			req.flash('error', 'chat:conversation.messageError');
			return res.redirect(CHAT_OPEN_REDIRECT);
		}

		try {
			const summary = await toggleMessageReaction({
				kind,
				conversationId: input.conversationId,
				messageId: input.messageId,
				userId: req.user.id,
				reaction: input.reaction,
			});

			if (wantsJson(req)) {
				return res.status(summary ? 200 : 400).json({
					ok: Boolean(summary),
					...summary,
				});
			}

			if (!summary) {
				req.flash('error', 'chat:conversation.messageError');
			}

			return res.redirect(CHAT_OPEN_REDIRECT);
		} catch (error) {
			return next(error);
		}
	};
}

export const reactToFriendChatMessage = createMessageReactionHandler('friend');
export const reactToRoomChatMessage = createMessageReactionHandler('room');
