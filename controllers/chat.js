//! controllers/chat.js

import { listFriendConversations } from '../services/chat/friends.js';

/**
 * Render the chat shell.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function renderChat(req, res) {
	res.render('chat/main', {
		titleKey: 'chat:title',
		styles: ['chat/main'],
		scripts: ['chat/main'],
	});
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
