//! controllers/notifications/main.js

import { NOTIFICATION_TYPES } from '../../constants/notifications.js';
import {
	countUnreadNotifications,
	listNotifications,
} from '../../services/notifications/appNotifications.js';

const CHAT_ROOM_JOIN_REQUEST_ACTIONS = Object.freeze([
	{
		key: 'approve',
		icon: 'bi-check-lg',
		tooltipKey: 'notifications:actions.approve',
	},
	{
		key: 'reject',
		icon: 'bi-x-lg',
		tooltipKey: 'notifications:actions.reject',
	},
	{
		key: 'dismiss',
		icon: 'bi-bell-slash',
		tooltipKey: 'notifications:actions.dismiss',
	},
]);

function getActorDisplayName(notification) {
	return notification.actor_username || notification.actor_email || '';
}

function getNotificationActions(notification) {
	if (notification.responded_at) {
		return [];
	}

	if (notification.type === NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST) {
		return CHAT_ROOM_JOIN_REQUEST_ACTIONS;
	}

	return [];
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
		linkUrl: notification.link_url,
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
		const [notifications, unreadCount] = await Promise.all([
			listNotifications(req.user.id),
			countUnreadNotifications(req.user.id),
		]);

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
