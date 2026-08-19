//! controllers/chat/messages/reactions.js

import {
	listMessageReactionUsers,
	toggleMessageReaction,
} from '../../../services/chat/messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT } from '../../../constants/chat.js';
import { wantsJson } from './utils.js';

function getReactionDetailsInput(req) {
	return {
		conversationId: req.session.chat?.activeConversationId || null,
		messageId: String(req.query?.messageId || '').trim(),
		reaction: String(req.query?.reaction || '').trim(),
	};
}

function getActiveReactionInput(req) {
	return {
		conversationId: req.session.chat?.activeConversationId || null,
		messageId: String(req.body?.messageId || '').trim(),
		reaction: String(req.body?.reaction || '').trim(),
	};
}

function createMessageReactionDetailsHandler(kind) {
	return async function getChatMessageReactionUsers(req, res, next) {
		const input = getReactionDetailsInput(req);

		if (
			!input.conversationId ||
			!isValidUuid(input.conversationId) ||
			!isValidUuid(input.messageId) ||
			!input.reaction
		) {
			return res.status(400).json({
				ok: false,
				users: [],
			});
		}

		try {
			const details = await listMessageReactionUsers({
				kind,
				conversationId: input.conversationId,
				messageId: input.messageId,
				viewerUserId: req.user.id,
				reaction: input.reaction,
			});

			return res.status(details ? 200 : 404).json({
				ok: Boolean(details),
				...(details || { users: [] }),
			});
		} catch (error) {
			return next(error);
		}
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

export const getFriendChatMessageReactionUsers =
	createMessageReactionDetailsHandler('friend');
export const getRoomChatMessageReactionUsers =
	createMessageReactionDetailsHandler('room');
export const reactToFriendChatMessage = createMessageReactionHandler('friend');
export const reactToRoomChatMessage = createMessageReactionHandler('room');
