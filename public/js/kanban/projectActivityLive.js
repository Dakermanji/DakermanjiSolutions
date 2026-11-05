//! public/js/kanban/projectActivityLive.js

(() => {
	const page = document.querySelector('.kanban-page[data-kanban-project-id]');
	if (!page || typeof window.io !== 'function') return;

	const projectId = page.dataset.kanbanProjectId;
	if (!projectId) return;

	const socket = window.io({ withCredentials: true });

	async function refreshProjectActivity() {
		const response = await fetch(
			`/kanban/${encodeURIComponent(projectId)}/activity/events`,
			{ credentials: 'same-origin' },
		);
		if (!response.ok) return;

		const template = document.createElement('template');
		template.innerHTML = (await response.text()).trim();
		const updated = template.content.querySelector('.kanban-panel');
		const current = page.querySelector('.kanban-panel');
		if (updated && current?.isConnected) current.replaceWith(updated);
	}

	for (const event of [
		'kanban:task:created',
		'kanban:task:edited',
		'kanban:task:assignee_changed',
		'kanban:task:stage_changed',
		'kanban:task:archived',
		'kanban:task:restored',
	]) {
		socket.on(event, async ({ task } = {}) => {
			if (task?.project_id !== projectId) return;
			try {
				await refreshProjectActivity();
			} catch (error) {
				console.error('Kanban project activity refresh failed', error);
			}
		});
	}

	socket.on('kanban:project:activity_changed', async ({ projectId: changedProjectId } = {}) => {
		if (changedProjectId !== projectId) return;
		try {
			await refreshProjectActivity();
		} catch (error) {
			console.error('Kanban project activity refresh failed', error);
		}
	});

	socket.on('connect', () => {
		socket.emit('kanban:project:join', { projectId }, (response) => {
			if (!response?.ok) socket.disconnect();
		});
	});

	window.addEventListener('pagehide', () => {
		socket.emit('kanban:project:leave', { projectId });
	}, { once: true });
})();
