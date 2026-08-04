//! public/js/chat/main-page/badges.js

(() => {
	const {
		escapeCssIdentifier,
		formatCount,
		getSectionBody,
	} = window.ChatMainUtils;

	function createUnreadBadge(count, unreadLabel) {
		const unreadCount = Number(count || 0);
		const unreadBadge = document.createElement('span');

		if (unreadCount <= 0) {
			unreadBadge.className = 'chat-unread-spacer';
			unreadBadge.setAttribute('aria-hidden', 'true');
			return unreadBadge;
		}

		unreadBadge.className = 'chat-unread-badge';
		unreadBadge.textContent = formatCount(unreadCount);
		unreadBadge.setAttribute(
			'aria-label',
			(unreadLabel || '').replace('{{count}}', unreadBadge.textContent),
		);

		return unreadBadge;
	}

	function updateSectionCount(sectionId, count) {
		const countElement = document.querySelector(
			`[data-chat-count-section="${escapeCssIdentifier(sectionId)}"]`,
		);

		if (!countElement) return;

		countElement.textContent = formatCount(count);
	}

	function updateSectionUnreadCount(sectionId, count, unreadLabel) {
		const badge = document.querySelector(
			`[data-chat-unread-section="${escapeCssIdentifier(sectionId)}"]`,
		);

		if (!badge) return;

		const unreadCount = Number(count || 0);
		const formattedCount = formatCount(unreadCount);

		badge.textContent = formattedCount;
		badge.setAttribute(
			'aria-label',
			(unreadLabel || '').replace('{{count}}', formattedCount),
		);
		badge.classList.toggle('is-hidden', unreadCount <= 0);
	}

	function updateSectionUnreadCountsFromPayload(sections) {
		if (!sections || typeof sections !== 'object') return;

		for (const [sectionId, unreadCount] of Object.entries(sections)) {
			const sectionBody = getSectionBody(sectionId);
			updateSectionUnreadCount(
				sectionId,
				unreadCount,
				sectionBody?.dataset.unreadLabel || '',
			);
		}
	}

	window.ChatMainBadges = {
		createUnreadBadge,
		updateSectionCount,
		updateSectionUnreadCount,
		updateSectionUnreadCountsFromPayload,
	};
})();
