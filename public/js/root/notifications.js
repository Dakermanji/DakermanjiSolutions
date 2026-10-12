//! public/js/root/notifications.js

const notificationUnreadBadges = document.querySelectorAll(
	'[data-nav-badge="notificationsUnread"]',
);
let notificationSocket = null;
let notificationExpiryTimer = null;
let notificationContentRequest = null;

connectNotificationsNavbarSocket();

function connectNotificationsNavbarSocket() {
	if (
		typeof window.io !== 'function'
		|| (
			notificationUnreadBadges.length === 0
			&& !document.querySelector('[data-notifications-unread-count]')
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
		refreshNotificationContent();
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
	if (!nextExpiresAt) return;

	const expiresAt = new Date(nextExpiresAt).getTime();
	if (!Number.isFinite(expiresAt)) return;

	const maximumDelay = 2_147_483_647;
	const delay = Math.min(Math.max(expiresAt - Date.now() + 100, 1000), maximumDelay);
	notificationExpiryTimer = window.setTimeout(
		requestNotificationUnreadState,
		delay,
	);
}

function updateNotificationUnreadBadges(value) {
	const unreadCount = Number(value) || 0;
	const formatter = new Intl.NumberFormat(document.documentElement.lang || 'en');
	const formattedCount = formatter.format(unreadCount);

	document.querySelectorAll('[data-notifications-unread-count]').forEach((counter) => {
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

async function refreshNotificationContent() {
	notificationContentRequest?.abort();
	const request = new AbortController();
	notificationContentRequest = request;

	try {
		const includePage = Boolean(document.querySelector('[data-notifications-page]'));
		const response = await fetch(`/notifications/live${includePage ? '?page=1' : ''}`, {
			headers: { Accept: 'application/json' },
			credentials: 'same-origin',
			cache: 'no-store',
			signal: request.signal,
		});
		if (!response.ok) return;

		const content = await response.json();
		if (request.signal.aborted) return;
		const fragment = document.createElement('template');

		const currentMenu = document.querySelector('.nav-notifications-menu');
		if (currentMenu && content.dropdown) {
			fragment.innerHTML = content.dropdown;
			const updatedMenu = fragment.content.querySelector('.nav-notifications-menu');
			if (updatedMenu) currentMenu.innerHTML = updatedMenu.innerHTML;
		}

		const currentPage = document.querySelector('[data-notifications-page]');
		if (currentPage && content.page) {
			fragment.innerHTML = content.page;
			const updatedPage = fragment.content.querySelector('[data-notifications-page]');
			if (updatedPage) {
				const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
				if (csrfToken) {
					updatedPage.querySelectorAll('.notification-action-form').forEach((form) => {
						const field = document.createElement('input');
						field.type = 'hidden';
						field.name = '_csrf';
						field.value = csrfToken;
						form.append(field);
					});
				}
				currentPage.replaceWith(updatedPage);
				window.AppTooltips?.initIn(updatedPage);
				window.dispatchEvent(new Event('app:notifications-content:updated'));
			}
		}
	} catch (error) {
		if (error.name !== 'AbortError') {
			console.error('Notification refresh failed', error);
		}
	} finally {
		if (notificationContentRequest === request) {
			notificationContentRequest = null;
		}
	}
}
