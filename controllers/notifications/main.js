//! controllers/notifications/main.js

import { CHAT_OPEN_REDIRECT } from '../../constants/chat.js';
import {
	NOTIFICATIONS_REDIRECT,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import {
	acceptRoomInvitation,
	approvePrivateRoomRequest,
	rejectPrivateRoomRequest,
	rejectRoomInvitation,
} from '../../services/chat/rooms.js';
import {
	countUnreadNotifications,
	dismissNotification,
	listNotifications,
	markNotificationsRead,
} from '../../services/notifications/appNotifications.js';
import { getNotificationLinkUrl } from '../../services/notifications/links.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { setActiveChatConversation } from '../chat/session.js';

const DISMISS_NOTIFICATION_ACTION = Object.freeze({
	key: 'dismiss',
	icon: 'bi-x-lg',
	path: '/notifications/dismiss',
	tooltipKey: 'notifications:actions.dismiss',
});

const CHAT_ROOM_JOIN_REQUEST_ACTIONS = Object.freeze([
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

const CHAT_ROOM_INVITATION_ACTIONS = Object.freeze([
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

	if (!isValidUuid(conversationId)) {
		return [];
	}

	return [
		{
			key: 'open',
			icon: 'bi-box-arrow-in-right',
			path: '/chat/rooms/open',
			tooltipKey: 'notifications:actions.openRoom',
			fields: {
				conversationId,
			},
		},
	];
}

function getActorDisplayName(notification) {
	return notification.actor_username || notification.actor_email || '';
}

function getNotificationActions(notification) {
	let actions = [];

	if (notification.type === NOTIFICATION_TYPES.CHAT_ROOM_INVITATION) {
		actions = notification.responded_at ? [] : CHAT_ROOM_INVITATION_ACTIONS;
	}

	if (notification.type === NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST) {
		actions = notification.responded_at ? [] : CHAT_ROOM_JOIN_REQUEST_ACTIONS;
	}

	if (notification.type === NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST_APPROVED) {
		actions = notification.responded_at
			? []
			: createRoomOpenActions(notification);
	}

	if (notification.type === NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_PROMOTED) {
		actions = notification.responded_at
			? []
			: createRoomOpenActions(notification);
	}

	return [
		...actions,
		DISMISS_NOTIFICATION_ACTION,
	];
}

function getFirstUuidBodyValue(req, keys) {
	for (const key of keys) {
		const value = String(req.body?.[key] || '').trim();

		if (isValidUuid(value)) {
			return value;
		}
	}

	return '';
}

function serializeNotification(notification) {
	const createdAt = notification.created_at
		? new Date(notification.created_at)
		: null;

	return {
		id: notification.id,
		appKey: notification.app_key,
		type: notification.type,
		entityType: notification.entity_type,
		entityId: notification.entity_id,
		titleKey: notification.title_key,
		bodyKey: notification.body_key,
		linkUrl: getNotificationLinkUrl(notification),
		data: notification.data || {},
		priority: notification.priority,
		isRead: Boolean(notification.read_at),
		isDismissed: Boolean(notification.dismissed_at),
		isResponded: Boolean(notification.responded_at),
		responseKey: notification.response_key,
		actions: getNotificationActions(notification),
		expiresAt: notification.expires_at,
		createdAt: notification.created_at,
		createdAtTimestamp: createdAt ? createdAt.getTime() : null,
		actor: {
			id: notification.actor_user_id,
			username: notification.actor_username,
			email: notification.actor_email,
			displayName: getActorDisplayName(notification),
		},
	};
}

/**
 * Render the notifications page.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function renderNotifications(req, res, next) {
	try {
		const notifications = await listNotifications(req.user.id);
		const unreadNotificationIds = notifications
			.filter((notification) => !notification.read_at)
			.map((notification) => notification.id);
		const unreadNotificationIdSet = new Set(unreadNotificationIds);

		if (unreadNotificationIds.length > 0) {
			await markNotificationsRead(unreadNotificationIds, req.user.id);
			notifications.forEach((notification) => {
				if (unreadNotificationIdSet.has(notification.id)) {
					notification.read_at = new Date();
				}
			});
		}

		const unreadCount = await countUnreadNotifications(req.user.id);
		res.locals.notificationUnreadCount = unreadCount;

		if (Array.isArray(res.locals.notificationPreview)) {
			res.locals.notificationPreview = res.locals.notificationPreview.map(
				(notification) => ({
					...notification,
					isRead: unreadNotificationIdSet.has(notification.id)
						? true
						: notification.isRead,
				}),
			);
		}

		res.render('notifications/main', {
			titleKey: 'notifications:title',
			styles: ['notifications/main'],
			scripts: ['notifications/main'],
			notifications: notifications.map(serializeNotification),
			unreadCount,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Dismiss one notification for the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function dismissAppNotification(req, res, next) {
	const notificationId = getFirstUuidBodyValue(req, ['notificationId', 'id']);

	if (!notificationId) {
		req.flash('error', 'notifications:actions.dismissError');
		return res.redirect(NOTIFICATIONS_REDIRECT);
	}

	try {
		const didDismiss = await dismissNotification(notificationId, req.user.id);

		req.flash(
			didDismiss ? 'success' : 'error',
			didDismiss
				? 'notifications:actions.dismissSuccess'
				: 'notifications:actions.dismissError',
		);
		return res.redirect(NOTIFICATIONS_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Approve one chat room join request notification.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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

		req.flash(
			request ? 'success' : 'error',
			request
				? 'notifications:actions.approveSuccess'
				: 'notifications:actions.approveError',
		);
		return res.redirect(NOTIFICATIONS_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Reject one chat room join request notification.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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

		req.flash(
			request ? 'success' : 'error',
			request
				? 'notifications:actions.rejectSuccess'
				: 'notifications:actions.rejectError',
		);
		return res.redirect(NOTIFICATIONS_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Accept one chat room invitation notification.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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
			req.flash('error', 'notifications:actions.acceptInvitationError');
			return res.redirect(NOTIFICATIONS_REDIRECT);
		}

		setActiveChatConversation(req, result.invitation.conversation_id);
		req.flash('success', 'notifications:actions.acceptInvitationSuccess');
		return res.redirect(CHAT_OPEN_REDIRECT);
	} catch (error) {
		return next(error);
	}
}

/**
 * Reject one chat room invitation notification.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
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

		req.flash(
			result.ok ? 'success' : 'error',
			result.ok
				? 'notifications:actions.rejectInvitationSuccess'
				: 'notifications:actions.rejectInvitationError',
		);
		return res.redirect(NOTIFICATIONS_REDIRECT);
	} catch (error) {
		return next(error);
	}
}
