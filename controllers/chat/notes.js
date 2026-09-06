//! controllers/chat/notes.js

import {
	ensureNotesConversation,
	resetNotesConversation as resetNotesConversationService,
} from '../../services/chat/notes.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../constants/chat.js';
import { setActiveChatConversation } from './session.js';
import { isValidUuid } from '../../middlewares/validators/common.js';

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

/**
 * Hard reset the active self-notes conversation, then return to empty notes.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function resetNotesConversation(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;

	if (!activeConversationId || !isValidUuid(activeConversationId)) {
		req.flash('error', 'chat:notes.resetError');
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const result = await resetNotesConversationService(
			activeConversationId,
			req.user.id,
		);

		if (!result) {
			req.flash('error', 'chat:notes.resetError');
			return res.redirect(CHAT_REDIRECT);
		}

		setActiveChatConversation(req, result.conversationId);
		req.flash('success', 'chat:notes.resetSuccess');

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
