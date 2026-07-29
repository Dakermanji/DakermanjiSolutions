//! public/js/root/notifications.js

const notificationUnreadBadges = document.querySelectorAll(
	'[data-nav-badge="notificationsUnread"]',
);

connectNotificationsNavbarSocket();

function connectNotificationsNavbarSocket() {
	if (typeof window.io !== 'function' || notificationUnreadBadges.length === 0) {
		return;
	}

	const socket = window.io({
		withCredentials: true,
	});

	socket.on('notifications:unread:changed', (payload) => {
		updateNotificationUnreadBadges(payload?.unreadCount);
		window.dispatchEvent(
			new CustomEvent('app:notifications-unread:changed', {
				detail: payload || {},
			}),
		);
	});
}

function updateNotificationUnreadBadges(value) {
	const unreadCount = Number(value) || 0;
	const formatter = new Intl.NumberFormat(document.documentElement.lang || 'en');
	const formattedCount = formatter.format(unreadCount);

	notificationUnreadBadges.forEach((badge) => {
		badge.textContent = formattedCount;
		badge.hidden = unreadCount <= 0;

		const labelTemplate = badge.dataset.navBadgeTemplate;
		if (labelTemplate) {
			badge.setAttribute(
				'aria-label',
				labelTemplate.replace('{{count}}', formattedCount),
			);
		}
	});
}
