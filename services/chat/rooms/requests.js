//! services/chat/rooms/requests.js

import ChatRoomJoinRequestsModel from '../../../models/chat/RoomJoinRequests.js';
import {
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_RESPONSE_KEYS,
	NOTIFICATION_TYPES,
} from '../../../constants/notifications.js';
import { respondAndDismissNotificationsByEntity } from '../../notifications/appNotifications.js';
import {
	notifyRoomJoinRequestManagers,
	notifyRoomJoinRequestResult,
} from './notifications.js';

/**
 * Request access to one listed private room.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function requestPrivateListedRoom({ conversationId, userId }) {
	if (!conversationId || !userId) {
		return null;
	}

	const request = await ChatRoomJoinRequestsModel.createPrivateListedRoomRequest({
		conversationId,
		userId,
	});

	if (request) {
		await notifyRoomJoinRequestManagers(request.id);
	}

	return request;
}

/**
 * Cancel one pending private room access request.
 *
 * @param {object} input
 * @param {string} input.requestId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function cancelPrivateRoomRequest({ requestId, userId }) {
	if (!requestId || !userId) {
		return null;
	}

	const request = await ChatRoomJoinRequestsModel.cancelPendingRequestForUser({
		requestId,
		userId,
	});

	if (request) {
		await respondAndDismissNotificationsByEntity({
			entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_JOIN_REQUEST,
			entityId: request.id,
			responseKey: NOTIFICATION_RESPONSE_KEYS.CANCELED,
		});
	}

	return request;
}

/**
 * Approve one pending private room access request.
 *
 * @param {object} input
 * @param {string} input.requestId
 * @param {string} input.reviewerUserId
 * @returns {Promise<object|null>}
 */
export async function approvePrivateRoomRequest({
	requestId,
	reviewerUserId,
}) {
	if (!requestId || !reviewerUserId) {
		return null;
	}

	const request =
		await ChatRoomJoinRequestsModel.approvePendingRequestByManager({
			requestId,
			reviewerUserId,
		});

	if (request) {
		await respondAndDismissNotificationsByEntity({
			entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_JOIN_REQUEST,
			entityId: request.id,
			responseKey: NOTIFICATION_RESPONSE_KEYS.APPROVED,
		});
		await notifyRoomJoinRequestResult({
			request,
			reviewerUserId,
			type: NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST_APPROVED,
			titleKey: 'notifications:types.chatRoomJoinRequestApproved.title',
			bodyKey: 'notifications:types.chatRoomJoinRequestApproved.body',
			priority: NOTIFICATION_PRIORITIES.HIGH,
		});
	}

	return request;
}

/**
 * Reject one pending private room access request.
 *
 * @param {object} input
 * @param {string} input.requestId
 * @param {string} input.reviewerUserId
 * @returns {Promise<object|null>}
 */
export async function rejectPrivateRoomRequest({
	requestId,
	reviewerUserId,
}) {
	if (!requestId || !reviewerUserId) {
		return null;
	}

	const request =
		await ChatRoomJoinRequestsModel.rejectPendingRequestByManager({
			requestId,
			reviewerUserId,
		});

	if (request) {
		await respondAndDismissNotificationsByEntity({
			entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_JOIN_REQUEST,
			entityId: request.id,
			responseKey: NOTIFICATION_RESPONSE_KEYS.REJECTED,
		});
		await notifyRoomJoinRequestResult({
			request,
			reviewerUserId,
			type: NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST_REJECTED,
			titleKey: 'notifications:types.chatRoomJoinRequestRejected.title',
			bodyKey: 'notifications:types.chatRoomJoinRequestRejected.body',
		});
	}

	return request;
}
