//! public/js/kanban/dueDates.js

(() => {
	const dueIcons = [...document.querySelectorAll('[data-kanban-due-date]')];
	const labelSource = document.querySelector('.kanban-page[data-due-ended]');
	if (!dueIcons.length || !labelSource) return;

	const HOUR_MS = 60 * 60 * 1000;
	const EMOJIS = {
		ended: '🚫',
		within24: '🔥',
		later: '🟢',
	};
	const STATUS_LABELS = {
		ended: labelSource.getAttribute('data-due-ended'),
		within24: labelSource.getAttribute('data-due-within-24'),
		later: labelSource.getAttribute('data-due-later'),
	};

	function parseDueDate(value) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
		const [year, month, day] = value.split('-').map(Number);
		const calendarDate = new Date(year, month - 1, day, 12);
		if (calendarDate.getFullYear() !== year ||
			calendarDate.getMonth() !== month - 1 ||
			calendarDate.getDate() !== day) return null;
		return new Date(year, month - 1, day + 1);
	}

	function dueState(deadline, now) {
		const remaining = deadline.getTime() - now;
		if (remaining <= 0) return 'ended';
		if (remaining <= 24 * HOUR_MS) return 'within24';
		return 'later';
	}

	const entries = dueIcons.map((element) => ({
		element,
		due: parseDueDate(element.dataset.kanbanDueDate),
	})).filter((entry) => entry.due);

	function refreshDueIcons() {
		const now = Date.now();
		for (const { element, due } of entries) {
			const state = dueState(due, now);
			if (element.dataset.dueState === state) continue;
			const tooltip = STATUS_LABELS[state];
			const emoji = element.querySelector('.kanban-task-due-emoji');
			if (emoji) emoji.textContent = EMOJIS[state];
			element.dataset.dueState = state;
			element.setAttribute('aria-label', tooltip);
			element.setAttribute('data-bs-title', tooltip);
			if (window.bootstrap?.Tooltip) {
				window.bootstrap.Tooltip.getInstance(element)?.dispose();
				window.bootstrap.Tooltip.getOrCreateInstance(element, {
					title: tooltip,
					trigger: 'hover focus',
					delay: { show: 400, hide: 0 },
				});
			}
		}
	}

	refreshDueIcons();
	window.setInterval(() => {
		if (!document.hidden) refreshDueIcons();
	}, 60 * 1000);
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) refreshDueIcons();
	});
})();
