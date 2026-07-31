//! services/chat/rooms/requests.js

import ChatRoomJoinRequestsModel from '../../../models/chat/RoomJoinRequests.js';
import { CHAT_ROOM_ACTIVITY_ACTIONS } from '../../../constants/chat.js';
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
import { recordRoomActivity } from './activity.js';

async function recordJoinRequestReviewActivity({ request, action }) {
	return recordRoomActivity({
		roomId: request.room_id,
		conversationId: request.conversation_id,
		actorUserId: request.reviewed_by_user_id,
		targetUserId: request.requested_by_user_id,
		action,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_JOIN_REQUEST,
		entityId: request.id,
		metadata: {
			roomName: request.room_title,
			requestId: request.id,
		},
	});
}

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
		await recordJoinRequestReviewActivity({
			request,
			action: CHAT_ROOM_ACTIVITY_ACTIONS.JOIN_REQUEST_APPROVED,
		});
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
		await recordJoinRequestReviewActivity({
			request,
			action: CHAT_ROOM_ACTIVITY_ACTIONS.JOIN_REQUEST_REJECTED,
		});
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
