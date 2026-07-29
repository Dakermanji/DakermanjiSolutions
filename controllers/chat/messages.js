//! controllers/chat/messages.js

import {
	createFriendMessage,
	createRoomMessage,
	flagRoomMessage,
	listOlderFriendMessages,
	listOlderRoomMessages,
} from '../../services/chat/messages.js';
import { findOpenableRoomConversation } from '../../services/chat/rooms.js';
import { canChatMemberWrite } from '../../services/chat/rooms/permissions.js';
import { emitChatMessageCreated } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../constants/chat.js';

async function getRoomMessageFailureKey(conversationId, userId) {
	const room = await findOpenableRoomConversation(conversationId, userId);

	if (!room) {
		return 'chat:rooms.openError';
	}

	if (!canChatMemberWrite(room.member_status)) {
		return 'chat:conversation.mutedMessageError';
	}

	return 'chat:conversation.messageError';
}

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
 * Return older messages for the active room conversation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getOlderRoomMessages(req, res, next) {
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
		const page = await listOlderRoomMessages({
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
			req.flash(
				'error',
				await getRoomMessageFailureKey(activeConversationId, req.user.id),
			);
		} else {
			await emitChatMessageCreated(message);
		}

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Create a message in the active room conversation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function createRoomChatMessage(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;

	if (!activeConversationId || !isValidUuid(activeConversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const message = await createRoomMessage({
			conversationId: activeConversationId,
			senderUserId: req.user.id,
			body: req.body?.message,
		});

		if (!message) {
			req.flash('error', 'chat:conversation.messageError');
		} else {
			await emitChatMessageCreated(message);
		}

		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Flag a message in the active room conversation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function flagRoomChatMessage(req, res, next) {
	const activeConversationId = req.session.chat?.activeConversationId || null;
	const messageId = String(req.body?.messageId || '').trim();

	if (
		!activeConversationId ||
		!isValidUuid(activeConversationId) ||
		!isValidUuid(messageId)
	) {
		req.flash('error', 'chat:conversation.flagError');
		return res.redirect(CHAT_OPEN_REDIRECT);
	}

	try {
		const flag = await flagRoomMessage({
			conversationId: activeConversationId,
			messageId,
			flaggedByUserId: req.user.id,
		});

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
