//! controllers/chat/notes.js

import { ensureNotesConversation } from '../../services/chat/notes.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../constants/chat.js';
import { setActiveChatConversation } from './session.js';

/**
 * Ensure the signed-in user's notes conversation is active, then return to chat.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function openNotesConversation(req, res, next) {
	try {
		const notesConversation = await ensureNotesConversation(req.user.id);

		if (!notesConversation) {
			req.flash('error', 'chat:notes.openError');
			return res.redirect(CHAT_REDIRECT);
		}

		setActiveChatConversation(req, notesConversation.conversation.id);

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
