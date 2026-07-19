//! controllers/notifications/main.js

import {
	countUnreadNotifications,
	listNotifications,
} from '../../services/notifications/appNotifications.js';

function getActorDisplayName(notification) {
	return notification.actor_username || notification.actor_email || '';
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
