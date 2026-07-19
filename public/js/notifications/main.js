//! public/js/notifications/main.js

const notificationsPage = document.querySelector('[data-notifications-page]');
const notificationFilters = document.querySelectorAll('[data-notifications-filter]');
const notificationItems = document.querySelectorAll('[data-notification-item]');
const emptyFilterMessage = document.querySelector('[data-notifications-filter-empty]');

if (notificationsPage && notificationFilters.length > 0) {
	for (const filterButton of notificationFilters) {
		filterButton.addEventListener('click', () => {
			applyNotificationFilter(filterButton.dataset.notificationsFilter || 'all');
		});
	}
}

function applyNotificationFilter(filter) {
	let visibleCount = 0;

	for (const filterButton of notificationFilters) {
		const isActive = filterButton.dataset.notificationsFilter === filter;
		filterButton.classList.toggle('is-active', isActive);
		filterButton.setAttribute('aria-pressed', String(isActive));
	}

	for (const item of notificationItems) {
		const isUnread = item.dataset.notificationRead !== 'true';
		const isVisible = filter === 'all' || (filter === 'unread' && isUnread);

		item.hidden = !isVisible;
		if (isVisible) visibleCount += 1;
	}

	if (emptyFilterMessage) {
		emptyFilterMessage.hidden = visibleCount > 0;
	}
}
