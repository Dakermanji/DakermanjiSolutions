//! services/chat/rooms/notifications.js

import ChatRoomJoinRequestsModel from '../../../models/chat/RoomJoinRequests.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_RESPONSE_KEYS,
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

const roomMemberNotificationTypes = Object.freeze({
	promote: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_PROMOTED,
	demote: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_DEMOTED,
	remove: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_REMOVED,
	mute: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_MUTED,
	unmute: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_UNMUTED,
	ban: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_BANNED,
	unban: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_UNBANNED,
	delete_history: NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_HISTORY_DELETED,
});

const roomMemberNotificationNames = Object.freeze({
	promote: 'Promoted',
	demote: 'Demoted',
	remove: 'Removed',
	mute: 'Muted',
	unmute: 'Unmuted',
	ban: 'Banned',
	unban: 'Unbanned',
	delete_history: 'HistoryDeleted',
});

const roomMemberOpenableActions = new Set([
	'promote',
	'demote',
	'mute',
	'unmute',
]);

export async function notifyRoomMemberManagement({
	room,
	member,
	actorUserId,
	action,
}) {
	if (!room?.conversation_id || !member?.user_id || !actorUserId) {
		return null;
	}

	const type = roomMemberNotificationTypes[action];
	const notificationName = roomMemberNotificationNames[action];
	if (!type || !notificationName) return null;

	return createNotification({
		recipientUserId: member.user_id,
		actorUserId,
		appKey: NOTIFICATION_APP_KEYS.CHAT,
		type,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_MEMBER_MANAGEMENT,
		entityId: room.conversation_id,
		titleKey: `notifications:types.chatRoomMember${notificationName}.title`,
		bodyKey: `notifications:types.chatRoomMember${notificationName}.body`,
		linkUrl: roomMemberOpenableActions.has(action)
			? getChatRoomOpenUrl(room.conversation_id)
			: '/notifications',
		data: {
			conversationId: room.conversation_id,
			roomName: room.conversation?.title || room.title || '',
			managementAction: action,
		},
		priority: NOTIFICATION_PRIORITIES.NORMAL,
	});
}

export async function notifyRoomInvitationCreated({
	room,
	invitation,
	targetUser,
	actorUserId,
}) {
	if (!room?.conversation_id || !invitation?.id || !targetUser?.id) {
		return null;
	}

	return createNotificationIfNotExists({
		recipientUserId: targetUser.id,
		actorUserId,
		appKey: NOTIFICATION_APP_KEYS.CHAT,
		type: NOTIFICATION_TYPES.CHAT_ROOM_INVITATION,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_INVITATION,
		entityId: invitation.id,
		titleKey: 'notifications:types.chatRoomInvitation.title',
		bodyKey: 'notifications:types.chatRoomInvitation.body',
		linkUrl: '/notifications',
		data: {
			conversationId: room.conversation_id,
			invitationId: invitation.id,
			roomName: room.title || '',
		},
		priority: NOTIFICATION_PRIORITIES.NORMAL,
	});
}

export async function notifyRoomInvitationResponse({
	invitation,
	invitee,
	responseKey,
}) {
	if (
		!invitation?.id
		|| !invitation?.conversation_id
		|| !invitation?.invited_by_user_id
		|| !invitee?.id
	) {
		return null;
	}

	const accepted = responseKey === NOTIFICATION_RESPONSE_KEYS.ACCEPTED;
	const responseName = accepted ? 'Accepted' : 'Rejected';

	return createNotificationIfNotExists({
		recipientUserId: invitation.invited_by_user_id,
		actorUserId: invitee.id,
		appKey: NOTIFICATION_APP_KEYS.CHAT,
		type: accepted
			? NOTIFICATION_TYPES.CHAT_ROOM_INVITATION_ACCEPTED
			: NOTIFICATION_TYPES.CHAT_ROOM_INVITATION_REJECTED,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_INVITATION_RESULT,
		entityId: invitation.id,
		titleKey: `notifications:types.chatRoomInvitation${responseName}.title`,
		bodyKey: `notifications:types.chatRoomInvitation${responseName}.body`,
		linkUrl: getChatRoomOpenUrl(invitation.conversation_id),
		data: {
			conversationId: invitation.conversation_id,
			invitationId: invitation.id,
			inviteeName: invitee.username || invitee.email || '',
			roomName: invitation.room_title || '',
			response: responseKey,
		},
		priority: NOTIFICATION_PRIORITIES.NORMAL,
	});
}
