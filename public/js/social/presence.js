//! public/js/social/presence.js

function isSocialPresenceVisible() {
	return document.visibilityState === 'visible' && socialPanel?.classList.contains('show');
}

function updateSocialPresence(userId, status) {
	for (const body of [followersBody, followeesBody]) {
		for (const dot of body?.querySelectorAll('[data-social-presence]') || []) {
			if (dot.dataset.socialPresence !== userId) continue;
			const resolved = Object.hasOwn(socialPresenceLabels, status) ? status : 'offline';
			dot.dataset.status = resolved;
			dot.dataset.bsTitle = socialPresenceLabels[resolved];
			dot.setAttribute('aria-label', socialPresenceLabels[resolved]);
			window.bootstrap?.Tooltip.getInstance(dot)?.setContent({ '.tooltip-inner': socialPresenceLabels[resolved] });
		}
	}
}

function watchSocialPresence() {
	if (!socialSocket?.connected || !isSocialPresenceVisible()) return;
	const section = getOpenSocialSection();
	if (!['followers', 'followees'].includes(section)) return;
	socialSocket.emit('presence:watch', { scope: `social-${section}` }, (result) => {
		if (!result?.ok || !isSocialPresenceVisible() || getOpenSocialSection() !== section) return;
		for (const item of result.statuses || []) updateSocialPresence(item.userId, item.status);
	});
}

function unwatchSocialPresence() {
	socialSocket?.emit('presence:unwatch');
}

