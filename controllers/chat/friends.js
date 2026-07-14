//! controllers/chat/friends.js

import {
	findOpenableFriendConversation,
	listFriendConversations,
} from '../../services/chat/friends.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { CHAT_REDIRECT } from '../../constants/chat.js';

/**
 * Return friend chat conversations for the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getFriendChats(req, res, next) {
	try {
		const conversations = await listFriendConversations(req.user.id);
		return res.json({
			ok: true,
			conversations,
		});
	} catch (error) {
		return next(error);
	}
}

/**
 * Store the selected conversation in the session, then return to /chat.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function openFriendConversation(req, res, next) {
	const conversationId = String(req.body?.conversationId || '').trim();

	if (!isValidUuid(conversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const conversation = await findOpenableFriendConversation(
			conversationId,
			req.user.id,
		);

		if (!conversation) {
			return res.redirect(CHAT_REDIRECT);
		}

		req.session.chat = {
			...(req.session.chat || {}),
			activeConversationId: conversation.conversation_id,
		};

		return res.redirect(CHAT_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Clear the active conversation and return to the chat list.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function closeFriendConversation(req, res) {
	req.session.chat = {
		...(req.session.chat || {}),
		activeConversationId: null,
	};

	return res.redirect(CHAT_REDIRECT);
}
