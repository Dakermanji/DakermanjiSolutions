//! controllers/chat/roomFlags.js

import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../constants/chat.js';
import {
	deleteReviewedFlaggedRoomMessage,
	listRoomFlagReviewQueue,
	markRoomMessageFlagsSafe,
	ROOM_FLAG_REVIEW_RESULT,
} from '../../services/chat/rooms.js';
import { emitChatMessageDeleted } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { setActiveChatConversation } from './session.js';

const ROOM_FLAG_REVIEW_ACTIONS = Object.freeze({
	safe: {
		run: markRoomMessageFlagsSafe,
		successKey: 'chat:flags.safeSuccess',
		errorKey: 'chat:flags.safeError',
		emitDeleted: false,
	},
	delete: {
		run: deleteReviewedFlaggedRoomMessage,
		successKey: 'chat:flags.deleteSuccess',
		errorKey: 'chat:flags.deleteError',
		emitDeleted: true,
	},
});

function getRoomFlagReviewInput(req) {
	return {
		conversationId: String(
			req.body?.conversationId || req.query?.conversationId || '',
		).trim(),
		actorUserId: req.user?.id,
		messageId: String(req.body?.messageId || '').trim(),
	};
}

function getRoomFlagReviewStatus(reason) {
	if (reason === ROOM_FLAG_REVIEW_RESULT.INVALID_INPUT) return 400;
	if (reason === ROOM_FLAG_REVIEW_RESULT.FORBIDDEN) return 403;
	if (reason === ROOM_FLAG_REVIEW_RESULT.ROOM_NOT_FOUND) return 404;
	if (reason === ROOM_FLAG_REVIEW_RESULT.MESSAGE_NOT_FOUND) return 404;
	return 200;
}

function wantsJson(req) {
	return req.xhr || req.accepts(['html', 'json']) === 'json';
}

/**
 * Return pending flagged messages for one manageable room.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getRoomMessageFlags(req, res, next) {
	try {
		const result = await listRoomFlagReviewQueue({
			...getRoomFlagReviewInput(req),
			order: req.query?.order,
			limit: req.query?.limit,
		});

		return res.status(getRoomFlagReviewStatus(result.reason)).json({
			ok: result.ok,
			reason: result.reason,
			room: result.room,
			messages: result.messages,
		});
	} catch (error) {
		return next(error);
	}
}

function createRoomFlagReviewActionHandler(action) {
	return async function handleRoomFlagReviewAction(req, res, next) {
		const input = getRoomFlagReviewInput(req);

		if (
			!isValidUuid(input.conversationId) ||
			!isValidUuid(input.messageId)
		) {
			if (wantsJson(req)) {
				return res.status(400).json({
					ok: false,
					reason: ROOM_FLAG_REVIEW_RESULT.INVALID_INPUT,
				});
			}

			req.flash('error', action.errorKey);
			return res.redirect(CHAT_REDIRECT);
		}

		try {
			const result = await action.run(input);

			if (wantsJson(req)) {
				if (result.ok && action.emitDeleted) {
					await emitChatMessageDeleted({
						id: result.message.id,
						conversation_id: result.message.conversationId,
					});
				}

				return res.status(getRoomFlagReviewStatus(result.reason)).json({
					ok: result.ok,
					reason: result.reason,
					conversationId: input.conversationId,
					messageId: input.messageId,
				});
			}

			req.flash(
				result.ok ? 'success' : 'error',
				result.ok ? action.successKey : action.errorKey,
			);
			setActiveChatConversation(req, input.conversationId);

			if (result.ok && action.emitDeleted) {
				await emitChatMessageDeleted({
					id: result.message.id,
					conversation_id: result.message.conversationId,
				});
			}

			return res.redirect(CHAT_OPEN_REDIRECT);
		} catch (error) {
			return next(error);
		}
	};
}

export const markRoomMessageSafe = createRoomFlagReviewActionHandler(
	ROOM_FLAG_REVIEW_ACTIONS.safe,
);
export const deleteFlaggedRoomMessage = createRoomFlagReviewActionHandler(
	ROOM_FLAG_REVIEW_ACTIONS.delete,
);
