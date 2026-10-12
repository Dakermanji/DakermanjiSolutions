//! controllers/notifications/chat.js

import { CHAT_OPEN_REDIRECT } from '../../constants/chat.js';
import {
	NOTIFICATIONS_REDIRECT,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import {
	acceptRoomInvitation,
	approvePrivateRoomRequest,
	rejectPrivateRoomRequest,
	rejectRoomInvitation,
} from '../../services/chat/rooms.js';
import { emitChatRoomMembershipChanged } from '../../services/chat/live.js';
import { setActiveChatConversation } from '../chat/session.js';
import { dismissStaleActionNotification, getFirstUuidBodyValue } from './common.js';

const ROOM_JOIN_REQUEST_ACTIONS = Object.freeze([
	{
		key: 'approve',
		icon: 'bi-check-lg',
		path: '/notifications/chat/room-join-request/approve',
		tooltipKey: 'notifications:actions.approve',
	},
	{
		key: 'reject',
		icon: 'bi-x-circle',
		path: '/notifications/chat/room-join-request/reject',
		tooltipKey: 'notifications:actions.reject',
	},
]);

const ROOM_INVITATION_ACTIONS = Object.freeze([
	{
		key: 'accept',
		icon: 'bi-check-lg',
		path: '/notifications/chat/room-invitation/accept',
		tooltipKey: 'notifications:actions.acceptInvitation',
	},
	{
		key: 'reject',
		icon: 'bi-x-circle',
		path: '/notifications/chat/room-invitation/reject',
		tooltipKey: 'notifications:actions.rejectInvitation',
	},
]);

function createRoomOpenActions(notification) {
	const conversationId = String(notification.data?.conversationId || '').trim();
	if (!isValidUuid(conversationId)) return [];
	return [{
		key: 'open',
		icon: 'bi-box-arrow-in-right',
		path: '/chat/rooms/open',
		tooltipKey: 'notifications:actions.openRoom',
		fields: { conversationId },
	}];
}

export function getChatNotificationActions(notification) {
	switch (notification.type) {
		case NOTIFICATION_TYPES.CHAT_ROOM_INVITATION:
			return notification.responded_at ? [] : ROOM_INVITATION_ACTIONS;
		case NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST:
			return notification.responded_at ? [] : ROOM_JOIN_REQUEST_ACTIONS;
		case NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST_APPROVED:
		case NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_PROMOTED:
			return notification.responded_at ? [] : createRoomOpenActions(notification);
		default:
			return null;
	}
}

export async function approveChatRoomJoinRequest(req, res, next) {
	const requestId = getFirstUuidBodyValue(req, ['requestId', 'entityId']);
	if (!requestId) {
		req.flash('error', 'notifications:actions.approveError');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	}

	try {
		const request = await approvePrivateRoomRequest({
			requestId,
			reviewerUserId: req.user.id,
		});
		if (!request) {
			await dismissStaleActionNotification(req);
			req.flash('error', 'notifications:actions.noLongerAvailable');
			return res.redirect(NOTIFICATIONS_REDIRECT);
		}
		req.flash('success', 'notifications:actions.approveSuccess');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

export async function rejectChatRoomJoinRequest(req, res, next) {
	const requestId = getFirstUuidBodyValue(req, ['requestId', 'entityId']);
	if (!requestId) {
		req.flash('error', 'notifications:actions.rejectError');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	}

	try {
		const request = await rejectPrivateRoomRequest({
			requestId,
			reviewerUserId: req.user.id,
		});
		if (!request) {
			await dismissStaleActionNotification(req);
			req.flash('error', 'notifications:actions.noLongerAvailable');
			return res.redirect(NOTIFICATIONS_REDIRECT);
		}
		req.flash('success', 'notifications:actions.rejectSuccess');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

export async function acceptChatRoomInvitation(req, res, next) {
	const invitationId = getFirstUuidBodyValue(req, ['invitationId', 'entityId']);
	if (!invitationId) {
		req.flash('error', 'notifications:actions.acceptInvitationError');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	}

	try {
		const result = await acceptRoomInvitation({
			invitationId,
			userId: req.user.id,
		});
		if (!result.ok) {
			await dismissStaleActionNotification(req);
			req.flash('error', 'notifications:actions.noLongerAvailable');
			return res.redirect(NOTIFICATIONS_REDIRECT);
		}
		emitChatRoomMembershipChanged(result.member);
		setActiveChatConversation(req, result.invitation.conversation_id);
		req.flash('success', 'notifications:actions.acceptInvitationSuccess');
		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

export async function rejectChatRoomInvitation(req, res, next) {
	const invitationId = getFirstUuidBodyValue(req, ['invitationId', 'entityId']);
	if (!invitationId) {
		req.flash('error', 'notifications:actions.rejectInvitationError');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	}

	try {
		const result = await rejectRoomInvitation({
			invitationId,
			userId: req.user.id,
		});
		if (!result.ok) {
			await dismissStaleActionNotification(req);
			req.flash('error', 'notifications:actions.noLongerAvailable');
			return res.redirect(NOTIFICATIONS_REDIRECT);
		}
		req.flash('success', 'notifications:actions.rejectInvitationSuccess');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
