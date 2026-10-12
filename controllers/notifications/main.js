//! controllers/notifications/main.js

import { NOTIFICATION_LIMITS, NOTIFICATIONS_REDIRECT } from '../../constants/notifications.js';
import {
	countUnreadNotifications,
	dismissNotification,
	getNotificationForRecipient,
	listNotifications,
	markNotificationRead,
} from '../../services/notifications/appNotifications.js';
import { getNotificationLinkUrl } from '../../services/notifications/links.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { getNotificationActions } from './actions.js';
import { getFirstUuidBodyValue } from './common.js';

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

function renderFragment(res, view, locals) {
	return new Promise((resolve, reject) => {
		res.render(view, { ...locals, layout: false }, (error, html) => {
			if (error) reject(error);
			else resolve(html);
		});
	});
}

/** Render only the notification areas used by the live interface. */
export async function renderLiveNotifications(req, res, next) {
	try {
		const includePage = req.query.page === '1';
		const [notifications, unreadCount] = await Promise.all([
			listNotifications(req.user.id, {
				limit: includePage
					? NOTIFICATION_LIMITS.PAGE_SIZE
					: NOTIFICATION_LIMITS.PREVIEW_SIZE,
			}),
			countUnreadNotifications(req.user.id),
		]);
		const dropdown = await renderFragment(res, 'notifications/_dropdown', {
			notificationBadgeCount: unreadCount,
			notificationPreviewItems: notifications
				.slice(0, NOTIFICATION_LIMITS.PREVIEW_SIZE)
				.map(serializeNotification),
			keys: { notifications: req.t('nav.notifications') },
		});
		const page = includePage
			? await renderFragment(res, 'notifications/main', {
					notifications: notifications.map(serializeNotification),
				unreadCount,
			})
			: null;

		res.set('Cache-Control', 'private, no-store');
		res.json({ dropdown, page, unreadCount });
	} catch (error) {
		next(error);
	}
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

/** Mark one notification as read and open its destination. */
export async function openAppNotification(req, res, next) {
	const notificationId = String(req.params.notificationId || '').trim();
	res.set('Cache-Control', 'private, no-store');
	if (!isValidUuid(notificationId)) return res.redirect(NOTIFICATIONS_REDIRECT);

	try {
		const notification = await getNotificationForRecipient(
			notificationId,
			req.user.id,
		);
		if (
			!notification
			|| notification.dismissed_at
			|| (notification.expires_at && new Date(notification.expires_at) <= new Date())
		) {
			return res.redirect(NOTIFICATIONS_REDIRECT);
		}

		await markNotificationRead(notificationId, req.user.id);
		return res.redirect(getNotificationLinkUrl(notification));
	} catch (error) {
		return next(error);
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
