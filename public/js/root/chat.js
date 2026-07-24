//! public/js/root/chat.js

const chatUnreadBadge = document.querySelector('[data-nav-badge="chatUnread"]');

connectChatNavbarSocket();

function connectChatNavbarSocket() {
	if (typeof window.io !== 'function' || !chatUnreadBadge) return;

	const socket = window.io({
		withCredentials: true,
	});

	socket.on('chat:unread:changed', (payload) => {
		updateChatUnreadBadge(payload?.unreadCount);
		window.dispatchEvent(
			new CustomEvent('app:chat-unread:changed', {
				detail: payload || {},
			}),
		);
	});
}

function updateChatUnreadBadge(value) {
	const unreadCount = Number(value) || 0;
	const formatter = new Intl.NumberFormat(document.documentElement.lang || 'en');
	const formattedCount = formatter.format(unreadCount);

	chatUnreadBadge.textContent = formattedCount;
	chatUnreadBadge.hidden = unreadCount <= 0;

	const labelTemplate = chatUnreadBadge.dataset.navBadgeTemplate;
	if (labelTemplate) {
		chatUnreadBadge.setAttribute(
			'aria-label',
			labelTemplate.replace('{{count}}', formattedCount),
		);
	}
}
