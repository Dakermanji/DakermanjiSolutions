//! public/js/root/presence.js

(() => {
	if (typeof window.io !== 'function') return;

	const activityIntervalMs = 30_000;
	const socket = window.io({ withCredentials: true });
	let lastReportedAt = -Infinity;
	const selector = document.querySelector('[data-presence-trigger]');
	const dot = document.querySelector('[data-presence-dot]');
	const statusText = document.querySelector('[data-presence-text]');
	const mobileSelector = document.querySelector('[data-presence-mobile-trigger]');
	const mobileDot = document.querySelector('[data-presence-mobile-dot]');
	const mobileStatusText = document.querySelector('[data-presence-mobile-text]');
	const choices = document.querySelectorAll('[data-presence-choice]');
	const labels = JSON.parse(selector?.dataset.statusLabels || '{}');
	const feedback = document.querySelector('[data-presence-feedback]');
	const mobileFeedback = document.querySelector('[data-presence-mobile-feedback]');
	let currentStatus = selector?.dataset.offlineStatus;
	let ready = false;
	let requestVersion = 0;

	function showStatus(status) {
		if (!selector || !Object.hasOwn(labels, status)) return;
		currentStatus = status;
		if (dot) dot.dataset.status = status;
		if (statusText) statusText.textContent = labels[status];
		if (mobileDot) mobileDot.dataset.status = status;
		if (mobileStatusText) mobileStatusText.textContent = labels[status];
		selector.setAttribute('aria-label', labels[status]);
		mobileSelector?.setAttribute('aria-label', labels[status]);
		dot?.setAttribute('data-bs-title', labels[status]);
		if (dot) window.bootstrap?.Tooltip.getInstance(dot)?.setContent({ '.tooltip-inner': labels[status] });
		choices.forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.presenceChoice === status)));
	}

	function disableChoices(disabled) {
		choices.forEach((choice) => { choice.disabled = disabled; });
	}

	function announceFeedback(message) {
		if (feedback) feedback.textContent = message;
		if (mobileFeedback) mobileFeedback.textContent = message;
	}

	socket.on('presence:changed', (payload) => {
		if (!socket.connected) return;
		showStatus(payload?.status);
		ready = true;
		disableChoices(false);
		announceFeedback('');
	});

	socket.on('disconnect', showDisconnected);
	socket.on('connect_error', showDisconnected);
	socket.on('presence:error', () => {
		showDisconnected();
		announceFeedback(feedback?.dataset.error || '');
	});

	function showDisconnected() {
		ready = false;
		requestVersion++;
		showStatus(selector?.dataset.offlineStatus);
		disableChoices(true);
		announceFeedback(feedback?.dataset.connecting || '');
	}

	selector?.addEventListener('show.bs.dropdown', () => window.AppTooltips?.hideAll());
	choices.forEach((choice) => choice.addEventListener('click', () => {
		if (!socket.connected || !ready) return showDisconnected();
		window.bootstrap?.Dropdown?.getInstance(selector)?.hide();
		const status = choice.dataset.presenceChoice;
		const version = ++requestVersion;
		disableChoices(true);
		announceFeedback('');
		socket.timeout(5000).emit('presence:set', { status }, (error, result) => {
			if (version !== requestVersion || !socket.connected) return;
			disableChoices(false);
			if (error || !result?.ok) {
				showStatus(currentStatus);
				announceFeedback(feedback?.dataset.error || '');
				return;
			}
			showStatus(result.status);
		});
	}));

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
