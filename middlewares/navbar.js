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

/**
 * Extract the first URL segment from a request path.
 * Examples:
 * - "/" -> ""
 * - "/profile/settings" -> "profile"
 */
function firstSegment(path = '/') {
	return path.replace(/^\/+/, '').split('/')[0].toLowerCase();
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

		const isHtmlPageRequest =
			req.method === 'GET' && req.accepts(['html', 'json']) === 'html';

		if (req.user && isHtmlPageRequest) {
			try {
				const unreadChatCount =
					await countUnreadFriendMessages(req.user.id);

				baseUserAppsNavbar.forEach((item) => {
					if (item.link !== '/chat') return;

					item.badge = {
						count: unreadChatCount,
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
