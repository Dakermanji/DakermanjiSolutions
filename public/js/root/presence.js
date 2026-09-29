//! public/js/root/presence.js

(() => {
	if (typeof window.io !== 'function') return;

	const activityIntervalMs = 30_000;
	const socket = window.io({ withCredentials: true });
	let lastReportedAt = -Infinity;

	function reportActivity() {
		// Never buffer activity while disconnected or report hidden-tab activity.
		if (!socket.connected || document.visibilityState !== 'visible') return;
		const now = performance.now();
		if (now - lastReportedAt < activityIntervalMs) return;
		lastReportedAt = now;
		socket.emit('presence:activity');
	}

	socket.on('connect', () => {
		lastReportedAt = -Infinity;
		reportActivity();
	});

	for (const event of ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll']) {
		document.addEventListener(event, reportActivity, { passive: true, capture: true });
	}
	document.addEventListener('visibilitychange', reportActivity);
	window.addEventListener('focus', reportActivity);
})();
