//! controllers/chat.js

import {
	findOpenableFriendConversation,
	getOpenFriendConversation,
	listFriendConversations,
} from '../services/chat/friends.js';
import {
	createFriendMessage,
	listFriendMessages,
} from '../services/chat/messages.js';
import { isValidUuid } from '../middlewares/validators/common.js';

const CHAT_REDIRECT = '/chat';

/**
 * Render the chat shell.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function renderChat(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;

	try {
		if (activeConversationId && isValidUuid(activeConversationId)) {
			const activeConversation = await getOpenFriendConversation(
				activeConversationId,
				req.user.id,
			);

			if (activeConversation) {
				const messages = await listFriendMessages(
					activeConversation.conversation.id,
					req.user.id,
				);

				return res.render('chat/conversation', {
					titleKey: 'chat:title',
					styles: ['chat/main'],
					activeConversation,
					messages,
				});
			}
		}

		if (req.session.chat?.activeConversationId) {
			req.session.chat = {
				...(req.session.chat || {}),
				activeConversationId: null,
			};
		}

		return res.render('chat/main', {
			titleKey: 'chat:title',
			styles: ['chat/main'],
			scripts: ['chat/main'],
			activeChatConversationId: null,
		});
	} catch (error) {
		return next(error);
	}
}

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
export async function openChatConversation(req, res, next) {
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
export function closeChatConversation(req, res) {
	req.session.chat = {
		...(req.session.chat || {}),
		activeConversationId: null,
	};

	return res.redirect(CHAT_REDIRECT);
}

/**
 * Create a message in the active friend conversation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function createChatMessage(req, res, next) {
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
		}

		return res.redirect(CHAT_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
