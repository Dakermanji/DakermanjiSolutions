//! controllers/chat/notes.js

import {
	ensureNotesConversation,
	resetNotesConversation as resetNotesConversationService,
} from '../../services/chat/notes.js';
import { CHAT_REDIRECT } from '../../constants/chat.js';
import { renderChat } from './render.js';
import { emitChatNotesReset } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import ChatMessagesModel from '../../models/chat/Messages.js';

const NOTES_URL = '/chat/notes';

export async function renderNotesConversation(req, res, next) {
	try {
		const notesConversation = await ensureNotesConversation(req.user.id);
		if (!notesConversation) {
			req.flash('error', 'chat:notes.openError');
			return res.redirect(CHAT_REDIRECT);
		}

		return renderChat(req, res, next, notesConversation.conversation.id);
	} catch (error) {
		return next(error);
	}
}

export async function getNotesMessageStatus(req, res, next) {
	const messageId = String(req.query?.messageId || '').trim();
	if (!isValidUuid(messageId)) {
		return res.status(400).json({ ok: false });
	}

	if (!req.chatNotesConversationId) {
		return res.status(404).json({ ok: false });
	}

	try {
		const message = await ChatMessagesModel.findConversationMessageById({
			conversationId: req.chatNotesConversationId,
			messageId,
			viewerUserId: req.user.id,
		});
		res.set('Cache-Control', 'no-store');
		return res.json({ ok: true, exists: Boolean(message) });
	} catch (error) {
		return next(error);
	}
}

/**
 * Hard reset the signed-in user's self-notes conversation, then return to empty notes.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function resetNotesConversation(req, res, next) {
	const activeConversationId = req.chatNotesConversationId;

	if (!activeConversationId) {
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

		emitChatNotesReset(result.conversationId, req.user.id);
		req.flash('success', 'chat:notes.resetSuccess');

		return res.redirect(NOTES_URL);
	} catch (error) {
		return next(error);
	}
}
