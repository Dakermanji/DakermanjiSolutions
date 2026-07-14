//! controllers/chat/messages.js

import {
	createFriendMessage,
	listOlderFriendMessages,
} from '../../services/chat/messages.js';
import { emitChatMessageCreated } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { CHAT_REDIRECT } from '../../constants/chat.js';

/**
 * Return older messages for the active friend conversation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getOlderFriendMessages(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;
	const beforeId = String(req.query?.beforeId || '').trim();

	if (
		!activeConversationId ||
		!isValidUuid(activeConversationId) ||
		!isValidUuid(beforeId)
	) {
		return res.status(400).json({
			ok: false,
		});
	}

	try {
		const page = await listOlderFriendMessages({
			conversationId: activeConversationId,
			viewerUserId: req.user.id,
			beforeId,
		});

		if (!page) {
			return res.status(404).json({
				ok: false,
			});
		}

		return res.json({
			ok: true,
			...page,
		});
	} catch (error) {
		return next(error);
	}
}

/**
 * Create a message in the active friend conversation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function createFriendChatMessage(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;

	if (!activeConversationId || !isValidUuid(activeConversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const message = await createFriendMessage({
			conversationId: activeConversationId,
			senderUserId: req.user.id,
			body: req.body?.message,
		});

		if (!message) {
			req.flash('error', 'chat:conversation.messageError');
		} else {
			await emitChatMessageCreated(message);
		}

		return res.redirect(CHAT_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
