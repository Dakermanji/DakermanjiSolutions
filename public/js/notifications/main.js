//! public/js/notifications/main.js

let currentNotificationFilter = 'all';

document.addEventListener('click', (event) => {
	const filterButton = event.target.closest('[data-notifications-filter]');
	if (!filterButton) return;
	currentNotificationFilter = filterButton.dataset.notificationsFilter || 'all';
	applyNotificationFilter(currentNotificationFilter);
});

window.addEventListener('app:notifications-content:updated', () => {
	applyNotificationFilter(currentNotificationFilter);
});

function applyNotificationFilter(filter) {
	const notificationFilters = document.querySelectorAll('[data-notifications-filter]');
	const notificationItems = document.querySelectorAll('[data-notification-item]');
	const emptyFilterMessage = document.querySelector('[data-notifications-filter-empty]');
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
