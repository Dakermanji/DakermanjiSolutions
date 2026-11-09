//! public/js/social/main.js

for (const collapse of [followersCollapse, followeesCollapse]) {
	collapse?.addEventListener('hide.bs.collapse', unwatchSocialPresence);
	collapse?.addEventListener('shown.bs.collapse', watchSocialPresence);
}

document.addEventListener('visibilitychange', () => {
	if (isSocialPresenceVisible()) {
		const section = getOpenSocialSection();
		if (section === 'followers') void loadFollowers(true);
		if (section === 'followees') void loadFollowees(true);
	} else unwatchSocialPresence();
});

if (socialPanel) {
	socialPanel.addEventListener('shown.bs.offcanvas', () => {
		const section = getOpenSocialSection();
		if (section === 'followers') void loadFollowers(true);
		if (section === 'followees') void loadFollowees(true);
	});
	socialPanel.addEventListener('hide.bs.offcanvas', unwatchSocialPresence);
	socialPanel.addEventListener('show.bs.offcanvas', () => {
		void loadSocialCounts();
	});
}

connectSocialSocket();

if (notificationsCollapse && notificationsBody) {
	notificationsCollapse.addEventListener('show.bs.collapse', () => {
		void loadNotifications();
	});

	notificationsBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

if (blockedCollapse && blockedBody) {
	blockedCollapse.addEventListener('show.bs.collapse', () => {
		void loadBlockedUsers();
	});

	blockedBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

if (followeesCollapse && followeesBody) {
	followeesCollapse.addEventListener('show.bs.collapse', () => {
		void loadFollowees();
	});

	followeesBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

if (followersCollapse && followersBody) {
	followersCollapse.addEventListener('show.bs.collapse', () => {
		void loadFollowers();
	});

	followersBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

