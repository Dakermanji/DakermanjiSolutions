//! public/js/kanban/taskActivityLive.js

(() => {
	const page = document.querySelector('.kanban-page[data-kanban-task-id]');
	if (!page || typeof window.io !== 'function') return;

	const projectId = page.dataset.kanbanProjectId;
	const taskId = page.dataset.kanbanTaskId;
	if (!projectId || !taskId) return;

	const socket = window.io({ withCredentials: true });
	let activityRefreshVersion = 0;

	async function refreshTaskActivity() {
		const version = ++activityRefreshVersion;
		const response = await fetch(
			`/kanban/tasks/${encodeURIComponent(taskId)}/activity/events`,
			{ credentials: 'same-origin' },
		);
		if (!response.ok) return;

		const template = document.createElement('template');
		template.innerHTML = (await response.text()).trim();
		const updated = template.content.querySelector('.kanban-panel');
		const current = page.querySelector('.kanban-panel');
		if (updated && current?.isConnected && version === activityRefreshVersion) {
			current.replaceWith(updated);
		}
	}

	for (const event of [
		'kanban:task:edited',
		'kanban:task:assignee_changed',
		'kanban:task:stage_changed',
		'kanban:task:reordered',
		'kanban:task:archived',
		'kanban:task:restored',
	]) {
		socket.on(event, async (payload = {}) => {
			const changedTaskId = payload.task?.id || payload.taskId;
			if (changedTaskId !== taskId) return;
			try {
				await refreshTaskActivity();
			} catch (error) {
				console.error('Kanban task activity refresh failed', error);
			}
		});
	}

	socket.on('connect', () => {
		socket.emit('kanban:project:join', { projectId }, (response) => {
			if (!response?.ok) socket.disconnect();
		});
	});

	window.addEventListener('pagehide', () => {
		socket.emit('kanban:project:leave', { projectId });
	}, { once: true });
})();
