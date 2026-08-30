//! controllers/chat/rooms.js

import UserModel from '../../models/User.js';
import {
	cancelPrivateRoomRequest,
	canLogRoomInvitationTarget,
	createRoom,
	findOpenableRoomConversation,
	getRoomActivityLogsPage,
	inviteRoomMember,
	joinPublicRoom,
	listPrivateRoomSection,
	listPublicRooms,
	recordRoomInvitationQueueAttempt,
	requestPrivateListedRoom,
	ROOM_ACTIVITY_LOG_RESULT,
	ROOM_INVITATION_RESULT,
	searchRooms,
	updateRoom,
} from '../../services/chat/rooms.js';
import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../constants/chat.js';
import { isValidUsername, isValidUuid } from '../../middlewares/validators/common.js';
import { setActiveChatConversation } from './session.js';

function getRoomInput(req) {
	return {
		ownerUserId: req.user?.id,
		name: req.body?.name,
		description: req.body?.description,
		keywords: req.body?.keywords,
		visibility: req.body?.visibility,
	};
}

function getRoomUpdateInput(req) {
	return {
		conversationId: req.session.chat?.activeConversationId,
		actorUserId: req.user?.id,
		name: req.body?.name,
		description: req.body?.description,
		keywords: req.body?.keywords,
		visibility: req.body?.visibility,
	};
}

function getRoomActivityLogInput(req) {
	return {
		conversationId: String(req.query?.conversationId || '').trim(),
		actorUserId: req.user?.id,
		page: req.query?.page,
		perPage: req.query?.perPage,
		order: req.query?.order,
	};
}

function getRoomActivityLogStatus(reason) {
	if (reason === ROOM_ACTIVITY_LOG_RESULT.INVALID_INPUT) return 400;
	if (reason === ROOM_ACTIVITY_LOG_RESULT.FORBIDDEN) return 403;
	if (reason === ROOM_ACTIVITY_LOG_RESULT.ROOM_NOT_FOUND) return 404;
	return 200;
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
 * Update the active room info for its owner.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function updateChatRoom(req, res, next) {
	try {
		const result = await updateRoom(getRoomUpdateInput(req));

		if (!result.room) {
			req.flash('error', 'chat:rooms.updateError');
			return res.redirect(CHAT_OPEN_REDIRECT);
		}

		setActiveChatConversation(req, result.room.conversation_id);
		req.flash('success', 'chat:rooms.updateSuccess');
		return res.redirect(CHAT_OPEN_REDIRECT);
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
	const conversationId = String(
		req.body?.conversationId || req.params?.conversationId || '',
	).trim();

	if (!isValidUuid(conversationId)) {
		req.flash('error', 'chat:rooms.openError');
		return res.redirect(CHAT_REDIRECT);
	}

	try {
		const conversation = await findOpenableRoomConversation(
			conversationId,
			req.user.id,
		);

		if (!conversation) {
			req.flash('error', 'chat:rooms.openError');
			return res.redirect(CHAT_REDIRECT);
		}

		setActiveChatConversation(req, conversation.conversation_id);

		return res.redirect(CHAT_OPEN_REDIRECT);
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

		setActiveChatConversation(req, roomConversation.conversation.id);

		req.flash('success', 'chat:rooms.joinSuccess');
		return res.redirect(CHAT_OPEN_REDIRECT);
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
 * Invite one user to the active room, then return to the open conversation.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function inviteChatRoomMember(req, res, next) {
	const conversationId = String(req.body?.conversationId || '').trim();
	const submittedTargetUserId = String(req.body?.targetUserId || '').trim();
	const targetUsername = String(req.body?.targetUsername || '').trim();
	const isUsernameInvite = !isValidUuid(submittedTargetUserId);

	if (!isValidUuid(conversationId)) {
		req.flash('error', 'chat:rooms.inviteError');
		return res.redirect(CHAT_OPEN_REDIRECT);
	}

	try {
		let targetUserId = submittedTargetUserId;
		let canLogTarget = !isUsernameInvite;

		if (isUsernameInvite) {
			if (!isValidUsername(targetUsername)) {
				req.flash('error', 'chat:rooms.inviteError');
				return res.redirect(CHAT_OPEN_REDIRECT);
			}

			const targetUser = await UserModel.findByUsername(targetUsername);
			targetUserId = targetUser?.id || '';

			if (!isValidUuid(targetUserId)) {
				const queueResult = await recordRoomInvitationQueueAttempt({
					conversationId,
					actorUserId: req.user.id,
				});

				if (!queueResult.ok) {
					req.flash('error', 'chat:rooms.inviteError');
					return res.redirect(CHAT_OPEN_REDIRECT);
				}

				setActiveChatConversation(req, conversationId);
				req.flash('success', 'chat:rooms.inviteQueued');
				return res.redirect(CHAT_OPEN_REDIRECT);
			}

			canLogTarget = await canLogRoomInvitationTarget({
				actorUserId: req.user.id,
				targetUserId,
			});
		}

		if (!isValidUuid(targetUserId)) {
			req.flash('error', 'chat:rooms.inviteError');
			return res.redirect(CHAT_OPEN_REDIRECT);
		}

		const result = await inviteRoomMember({
			conversationId,
			actorUserId: req.user.id,
			targetUserId,
			logActivity: canLogTarget,
		});

		setActiveChatConversation(req, conversationId);

		if (isUsernameInvite && ![
			ROOM_INVITATION_RESULT.FORBIDDEN,
			ROOM_INVITATION_RESULT.INVALID_INPUT,
			ROOM_INVITATION_RESULT.ROOM_NOT_FOUND,
		].includes(result.reason)) {
			if (!canLogTarget || !result.ok) {
				await recordRoomInvitationQueueAttempt({
					conversationId,
					actorUserId: req.user.id,
				});
			}

			req.flash('success', 'chat:rooms.inviteQueued');
			return res.redirect(CHAT_OPEN_REDIRECT);
		}

		req.flash(
			result.ok ? 'success' : 'error',
			result.ok ? 'chat:rooms.inviteSuccess' : 'chat:rooms.inviteError',
		);
		return res.redirect(CHAT_OPEN_REDIRECT);
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

/**
 * Return room activity logs visible to active room owner/admin users.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getRoomActivityLogs(req, res, next) {
	try {
		const result = await getRoomActivityLogsPage(
			getRoomActivityLogInput(req),
		);

		return res.status(getRoomActivityLogStatus(result.reason)).json({
			ok: result.ok,
			reason: result.reason,
			room: result.room,
			activityPage: result.activityPage,
		});
	} catch (error) {
		return next(error);
	}
}
