//! public/js/root/notifications.js

const notificationUnreadBadges = document.querySelectorAll(
	'[data-nav-badge="notificationsUnread"]',
);
const notificationUnreadCounts = document.querySelectorAll(
	'[data-notifications-unread-count]',
);
let notificationSocket = null;
let notificationExpiryTimer = null;

connectNotificationsNavbarSocket();

function connectNotificationsNavbarSocket() {
	if (
		typeof window.io !== 'function'
		|| (
			notificationUnreadBadges.length === 0
			&& notificationUnreadCounts.length === 0
		)
	) {
		return;
	}

	notificationSocket = window.io({
		withCredentials: true,
	});

	notificationSocket.on('connect', requestNotificationUnreadState);
	notificationSocket.on('notifications:unread:changed', (payload) => {
		updateNotificationUnreadBadges(payload?.unreadCount);
		scheduleNotificationExpiryRefresh(payload?.nextExpiresAt);
		window.dispatchEvent(
			new CustomEvent('app:notifications-unread:changed', {
				detail: payload || {},
			}),
		);
	});

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			requestNotificationUnreadState();
		}
	});
	window.addEventListener('focus', requestNotificationUnreadState);
}

function requestNotificationUnreadState() {
	if (notificationSocket?.connected) {
		notificationSocket.emit('notifications:unread:request');
	}
}

function scheduleNotificationExpiryRefresh(nextExpiresAt) {
	window.clearTimeout(notificationExpiryTimer);
	notificationExpiryTimer = null;

	const expiresAt = new Date(nextExpiresAt).getTime();
	if (!Number.isFinite(expiresAt)) return;

	const maximumDelay = 2_147_483_647;
	const delay = Math.min(Math.max(expiresAt - Date.now() + 100, 0), maximumDelay);
	notificationExpiryTimer = window.setTimeout(
		requestNotificationUnreadState,
		delay,
	);
}

function updateNotificationUnreadBadges(value) {
	const unreadCount = Number(value) || 0;
	const formatter = new Intl.NumberFormat(document.documentElement.lang || 'en');
	const formattedCount = formatter.format(unreadCount);

	notificationUnreadCounts.forEach((counter) => {
		counter.textContent = formattedCount;
	});

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
