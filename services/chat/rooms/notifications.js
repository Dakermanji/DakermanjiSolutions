//! services/chat/rooms/notifications.js

import ChatRoomJoinRequestsModel from '../../../models/chat/RoomJoinRequests.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from '../../../constants/notifications.js';
import {
	createNotification,
	createNotificationIfNotExists,
} from '../../notifications/appNotifications.js';
import { getChatRoomOpenUrl } from '../../notifications/links.js';

function getRequesterDisplayName(recipient) {
	return recipient.requester_username || recipient.requester_email || '';
}

export async function notifyRoomJoinRequestManagers(requestId) {
	const recipients =
		await ChatRoomJoinRequestsModel.findPendingJoinRequestNotificationRecipients(
			requestId,
		);

	await Promise.all(
		recipients.map((recipient) =>
			createNotificationIfNotExists({
				recipientUserId: recipient.recipient_user_id,
				actorUserId: recipient.requested_by_user_id,
				appKey: NOTIFICATION_APP_KEYS.CHAT,
				type: NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST,
				entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_JOIN_REQUEST,
				entityId: recipient.request_id,
				titleKey: 'notifications:types.chatRoomJoinRequest.title',
				bodyKey: 'notifications:types.chatRoomJoinRequest.body',
				linkUrl: '/notifications',
				data: {
					conversationId: recipient.conversation_id,
					requestId: recipient.request_id,
					requesterName: getRequesterDisplayName(recipient),
					roomName: recipient.room_title,
				},
				priority: NOTIFICATION_PRIORITIES.HIGH,
			}),
		),
	);
}

export async function notifyRoomJoinRequestResult({
	request,
	reviewerUserId,
	type,
	titleKey,
	bodyKey,
	priority = NOTIFICATION_PRIORITIES.NORMAL,
}) {
	await createNotificationIfNotExists({
		recipientUserId: request.requested_by_user_id,
		actorUserId: reviewerUserId,
		appKey: NOTIFICATION_APP_KEYS.CHAT,
		type,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_JOIN_REQUEST_RESULT,
		entityId: request.id,
		titleKey,
		bodyKey,
		linkUrl: getChatRoomOpenUrl(request.conversation_id),
		data: {
			conversationId: request.conversation_id,
			requestId: request.id,
			roomName: request.room_title,
		},
		priority,
	});
}

export async function notifyRoomMemberPromoted({ room, member, actorUserId }) {
	if (!room?.conversation_id || !member?.user_id || !actorUserId) {
		return null;
	}

	return createNotification({
		recipientUserId: member.user_id,
		actorUserId,
		appKey: NOTIFICATION_APP_KEYS.CHAT,
		type: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_PROMOTED,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_MEMBER_ROLE,
		entityId: room.conversation_id,
		titleKey: 'notifications:types.chatRoomMemberPromoted.title',
		bodyKey: 'notifications:types.chatRoomMemberPromoted.body',
		linkUrl: getChatRoomOpenUrl(room.conversation_id),
		data: {
			conversationId: room.conversation_id,
			roomName: room.conversation?.title || room.title || '',
		},
		priority: NOTIFICATION_PRIORITIES.NORMAL,
	});
}
