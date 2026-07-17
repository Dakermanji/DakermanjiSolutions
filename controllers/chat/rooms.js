//! controllers/chat/rooms.js

import {
	createRoom,
	listPrivateRooms,
	listPublicRooms,
} from '../../services/chat/rooms.js';
import { CHAT_REDIRECT } from '../../constants/chat.js';

function getRoomInput(req) {
	return {
		ownerUserId: req.user?.id,
		name: req.body?.name,
		description: req.body?.description,
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
		const rooms = await listPrivateRooms(req.user.id);
		return res.json({
			ok: true,
			rooms,
		});
	} catch (error) {
		return next(error);
	}
}
