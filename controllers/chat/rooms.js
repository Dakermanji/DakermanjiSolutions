//! controllers/chat/rooms.js

import {
	cancelPrivateRoomRequest,
	createRoom,
	findOpenableRoomConversation,
	joinPublicRoom,
	listPrivateRoomSection,
	listPublicRooms,
	requestPrivateListedRoom,
	searchRooms,
} from '../../services/chat/rooms.js';
import { CHAT_REDIRECT } from '../../constants/chat.js';
import { isValidUuid } from '../../middlewares/validators/common.js';

function getRoomInput(req) {
	return {
		ownerUserId: req.user?.id,
		name: req.body?.name,
		description: req.body?.description,
		keywords: req.body?.keywords,
		visibility: req.body?.visibility,
	};
}

/**
 * Create a chat room for the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function createChatRoom(req, res, next) {
	try {
		const result = await createRoom(getRoomInput(req));

		if (!result.room) {
			req.flash('error', 'chat:rooms.createError');
			req.flash('modal', 'chat_room');
			return res.redirect(CHAT_REDIRECT);
		}

		req.flash('success', 'chat:rooms.createSuccess');
		return res.redirect(CHAT_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Store the selected room conversation in the session, then return to /chat.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function openRoomConversation(req, res, next) {
	const conversationId = String(req.body?.conversationId || '').trim();

	if (!isValidUuid(conversationId)) {
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const conversation = await findOpenableRoomConversation(
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
 * Join a public room, store it in the session, then return to /chat.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function joinPublicRoomConversation(req, res, next) {
	const conversationId = String(req.body?.conversationId || '').trim();

	if (!isValidUuid(conversationId)) {
		req.flash('error', 'chat:rooms.joinError');
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const roomConversation = await joinPublicRoom({
			conversationId,
			userId: req.user.id,
		});

		if (!roomConversation) {
			req.flash('error', 'chat:rooms.joinError');
			return res.redirect(CHAT_REDIRECT);
		}

		req.session.chat = {
			...(req.session.chat || {}),
			activeConversationId: roomConversation.conversation.id,
		};

		req.flash('success', 'chat:rooms.joinSuccess');
		return res.redirect(CHAT_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Request access to a listed private room, then return to /chat.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function requestPrivateRoomAccess(req, res, next) {
	const conversationId = String(req.body?.conversationId || '').trim();

	if (!isValidUuid(conversationId)) {
		req.flash('error', 'chat:rooms.requestError');
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const request = await requestPrivateListedRoom({
			conversationId,
			userId: req.user.id,
		});

		if (!request) {
			req.flash('error', 'chat:rooms.requestError');
			return res.redirect(CHAT_REDIRECT);
		}

		req.flash('success', 'chat:rooms.requestSuccess');
		return res.redirect(CHAT_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Cancel a pending listed private room access request, then return to /chat.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function cancelPrivateRoomAccessRequest(req, res, next) {
	const requestId = String(req.body?.requestId || '').trim();

	if (!isValidUuid(requestId)) {
		req.flash('error', 'chat:rooms.cancelRequestError');
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const request = await cancelPrivateRoomRequest({
			requestId,
			userId: req.user.id,
		});

		if (!request) {
			req.flash('error', 'chat:rooms.cancelRequestError');
			return res.redirect(CHAT_REDIRECT);
		}

		req.flash('success', 'chat:rooms.cancelRequestSuccess');
		return res.redirect(CHAT_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Return public rooms visible to the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getPublicRooms(req, res, next) {
	try {
		const rooms = await listPublicRooms(req.user.id);
		return res.json({
			ok: true,
			rooms,
		});
	} catch (error) {
		return next(error);
	}
}

/**
 * Return private rooms visible to the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getPrivateRooms(req, res, next) {
	try {
		const { rooms, pendingRequests } = await listPrivateRoomSection(
			req.user.id,
		);
		return res.json({
			ok: true,
			rooms,
			pendingRequests,
		});
	} catch (error) {
		return next(error);
	}
}

/**
 * Search public/listed rooms and joined unlisted rooms.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function searchVisibleRooms(req, res, next) {
	try {
		const rooms = await searchRooms(req.user.id, req.query?.q);
		return res.json({
			ok: true,
			rooms,
		});
	} catch (error) {
		return next(error);
	}
}
