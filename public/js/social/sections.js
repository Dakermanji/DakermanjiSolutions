//! public/js/social/sections.js

async function loadNotifications() {
	const url = notificationsBody.dataset.url;

	renderLoadingState(notificationsBody);

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !Array.isArray(payload.notifications)) {
			throw new Error('Invalid notifications payload');
		}

		updateSocialCount('notifications', payload.notifications.length);
		renderNotifications(payload.notifications);
	} catch (error) {
		console.error('Failed to load social notifications', error);
		renderMessage(notificationsBody, notificationsBody.dataset.errorLabel);
	}
}

async function loadBlockedUsers() {
	const url = blockedBody.dataset.url;

	renderLoadingState(blockedBody);

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !Array.isArray(payload.blocked)) {
			throw new Error('Invalid blocked users payload');
		}

		updateSocialCount('blocked', payload.blocked.length);
		renderBlockedUsers(payload.blocked);
	} catch (error) {
		console.error('Failed to load blocked users', error);
		renderMessage(blockedBody, blockedBody.dataset.errorLabel);
	}
}

async function loadFollowees(quiet = false) {
	const url = followeesBody.dataset.url;

	if (!quiet) renderLoadingState(followeesBody);

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !Array.isArray(payload.followees)) {
			throw new Error('Invalid followees payload');
		}

		if (quiet && (!isSocialPresenceVisible() || getOpenSocialSection() !== 'followees')) return;
		updateSocialCount('following', payload.followees.length);
		renderFollowees(payload.followees);
		if (isSocialPresenceVisible() && getOpenSocialSection() === 'followees') watchSocialPresence();
	} catch (error) {
		console.error('Failed to load followees', error);
		if (!quiet) renderMessage(followeesBody, followeesBody.dataset.errorLabel);
	}
}

async function loadFollowers(quiet = false) {
	const url = followersBody.dataset.url;

	if (!quiet) renderLoadingState(followersBody);

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !Array.isArray(payload.followers)) {
			throw new Error('Invalid followers payload');
		}

		if (quiet && (!isSocialPresenceVisible() || getOpenSocialSection() !== 'followers')) return;
		updateSocialCount('followers', payload.followers.length);
		renderFollowers(payload.followers);
		if (isSocialPresenceVisible() && getOpenSocialSection() === 'followers') watchSocialPresence();
	} catch (error) {
		console.error('Failed to load followers', error);
		if (!quiet) renderMessage(followersBody, followersBody.dataset.errorLabel);
	}
}

async function loadSocialCounts() {
	try {
		const response = await fetch('/social/counts', {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !payload.counts) {
			throw new Error('Invalid social counts payload');
		}

		updateSocialCounts(payload.counts);
	} catch (error) {
		console.error('Failed to load social counts', error);
	}
}

