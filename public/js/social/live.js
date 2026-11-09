//! public/js/social/live.js

function connectSocialSocket() {
	if (typeof window.io !== 'function') return;

	const socket = window.io({
		withCredentials: true,
	});
	socialSocket = socket;
	socket.on('connect', watchSocialPresence);
	socket.on('presence:peer:changed', (payload) => {
		if (isSocialPresenceVisible()) updateSocialPresence(payload?.userId, payload?.status);
	});

	socket.on('social:counts:changed', () => {
		void refreshLiveSocialState();
	});
}

async function refreshLiveSocialState() {
	await loadSocialCounts();

	const openSection = getOpenSocialSection();
	if (openSection) {
		await reloadSocialSection(openSection);
	}
}

function getOpenSocialSection() {
	if (followersCollapse?.classList.contains('show')) return 'followers';
	if (followeesCollapse?.classList.contains('show')) return 'followees';
	if (blockedCollapse?.classList.contains('show')) return 'blocked';
	if (notificationsCollapse?.classList.contains('show')) return 'notifications';

	return null;
}

function updateSocialCounts(counts) {
	for (const [key, value] of Object.entries(counts)) {
		updateSocialCount(key, value);
	}
}

function updateSocialCount(key, value) {
	const count = Number(value) || 0;

	socialCountBadges.forEach((badge) => {
		if (badge.dataset.socialCount !== key) return;

		badge.textContent = new Intl.NumberFormat(
			document.documentElement.lang || 'en',
		).format(count);
	});
}

