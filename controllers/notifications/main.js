//! controllers/notifications/main.js

/**
 * Render the notifications page.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function renderNotifications(req, res) {
	res.render('notifications/main', {
		titleKey: 'notifications:title',
	});
}
