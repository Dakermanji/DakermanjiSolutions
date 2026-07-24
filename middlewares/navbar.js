//! middlewares/navbar.js

/**
 * Navigation middleware
 * - Resolves and injects navigation items for the current route
 *
 * Notes:
 * - Designed to scale later for profile / authenticated sections.
 */

import { navbar } from '../config/navbar.js';
import { countUnreadFriendMessages } from '../services/chat/friends.js';
import { countUnreadRoomMessages } from '../services/chat/rooms.js';
import {
	countUnreadNotifications,
	listNotifications,
} from '../services/notifications/appNotifications.js';

const NOTIFICATION_PREVIEW_LIMIT = 5;

/**
 * Extract the first URL segment from a request path.
 * Examples:
 * - "/" -> ""
 * - "/profile/settings" -> "profile"
 */
function firstSegment(path = '/') {
	return path.replace(/^\/+/, '').split('/')[0].toLowerCase();
}

function formatNotificationPreview(notification) {
	return {
		id: notification.id,
		appKey: notification.app_key,
		type: notification.type,
		titleKey: notification.title_key,
		bodyKey: notification.body_key,
		linkUrl: notification.link_url || '/notifications',
		data: notification.data || {},
		isRead: Boolean(notification.read_at),
		actor: {
			username: notification.actor_username,
			email: notification.actor_email,
			displayName:
				notification.actor_username || notification.actor_email || '',
		},
	};
}

export const navbarMiddleware = (app) => {
	app.use(async (req, res, next) => {
		// Determine the navigation key based on the first path segment
		const seg = firstSegment(req.path);

		// Root path maps to "index" navigation
		const key = seg === '' ? 'index' : seg;

		const baseUserAppsNavbar = Array.isArray(navbar.user_apps)
			? navbar.user_apps.map((item) => ({ ...item }))
			: [];

		// Expose navigation items to views
		res.locals.navbar = Array.isArray(navbar[key]) ? navbar[key] : [];
		res.locals.userAppsNavbar = baseUserAppsNavbar;
		res.locals.notificationUnreadCount = 0;
		res.locals.notificationPreview = [];

		const isHtmlPageRequest =
			req.method === 'GET' && req.accepts(['html', 'json']) === 'html';

		if (req.user && isHtmlPageRequest) {
			try {
				const [
					unreadFriendChatCount,
					unreadRoomChatCount,
					unreadNotificationCount,
					notificationPreview,
				] =
					await Promise.all([
						countUnreadFriendMessages(req.user.id),
						countUnreadRoomMessages(req.user.id),
						countUnreadNotifications(req.user.id),
						listNotifications(req.user.id, {
							limit: NOTIFICATION_PREVIEW_LIMIT,
						}),
					]);

				res.locals.notificationUnreadCount = unreadNotificationCount;
				res.locals.notificationPreview = notificationPreview.map(
					formatNotificationPreview,
				);

				baseUserAppsNavbar.forEach((item) => {
					if (item.link !== '/chat') return;

					item.badge = {
						count: unreadFriendChatCount + unreadRoomChatCount,
						label: 'chat:unreadMessages',
						key: 'chatUnread',
					};
				});
			} catch (error) {
				return next(error);
			}
		}

		// Expose active navigation key for styling / state
		res.locals.activeNavKey = key;

		next();
	});
};
