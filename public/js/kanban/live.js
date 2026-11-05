//! public/js/kanban/live.js

(() => {
	const page = document.querySelector('.kanban-page[data-kanban-project-id]');
	if (!page || typeof window.io !== 'function') return;

	const projectId = page.dataset.kanbanProjectId;
	if (!projectId) return;

	const socket = window.io({ withCredentials: true });
	const board = page.querySelector('[data-kanban-board]');

	async function fetchTaskCard(taskId) {
		const response = await fetch(`/kanban/tasks/${encodeURIComponent(taskId)}/card`, {
			credentials: 'same-origin',
		});
		if (!response.ok) return null;
		const markup = await response.text();
		const template = document.createElement('template');
		template.innerHTML = markup.trim();
		const card = template.content.firstElementChild;
		return card?.matches('[data-kanban-task-card]') ? card : null;
	}

	async function refreshTaskCard(taskId) {
		const existing = board?.querySelector(
			`[data-kanban-task-card][data-task-id="${CSS.escape(taskId)}"]`,
		);
		if (!existing) return;

		const updated = await fetchTaskCard(taskId);
		if (!updated || !existing.isConnected) return;
		window.AppTooltips?.reset(existing);
		existing.replaceWith(updated);
		window.AppTooltips?.initIn(updated);
	}

	socket.on('kanban:task:created', async ({ task } = {}) => {
		if (!board || !task?.id || task.project_id !== projectId) return;
		const column = board.querySelector(`[data-kanban-dropzone][data-stage="${task.status}"]`);
		if (!column || column.querySelector(`[data-task-id="${CSS.escape(task.id)}"]`)) return;

		const taskList = column.querySelector('.kanban-task-list');
		const previousLastCard = taskList?.lastElementChild;
		try {
			const [card, refreshedPreviousLastCard] = await Promise.all([
				fetchTaskCard(task.id),
				previousLastCard
					? fetchTaskCard(previousLastCard.dataset.taskId)
					: Promise.resolve(null),
			]);
			if (!card || !page.isConnected) return;

			let list = column.querySelector('.kanban-task-list');
			if (!list) {
				list = document.createElement('ul');
				list.className = 'kanban-task-list';
				column.querySelector('.kanban-column-empty')?.remove();
				column.append(list);
			}
			if (refreshedPreviousLastCard && previousLastCard?.isConnected) {
				previousLastCard.replaceWith(refreshedPreviousLastCard);
			}
			if (list.querySelector(`[data-task-id="${CSS.escape(task.id)}"]`)) return;
			list.append(card);
			[...list.children]
				.sort((left, right) => Number(left.dataset.taskPosition) - Number(right.dataset.taskPosition))
				.forEach((item) => list.append(item));

			const countBadge = column.querySelector('.kanban-column-heading .badge');
			if (countBadge) {
				countBadge.textContent = new Intl.NumberFormat(
					document.documentElement.lang || 'en',
				).format(list.children.length);
			}
			window.AppTooltips?.initIn(card);
		} catch (error) {
			console.error('Kanban task card update failed', error);
		}
	});

	socket.on('kanban:task:edited', async ({ task } = {}) => {
		if (!task?.id || task.project_id !== projectId) return;
		try {
			await refreshTaskCard(task.id);
		} catch (error) {
			console.error('Kanban task card refresh failed', error);
		}
	});

	socket.on('kanban:task:assignee_changed', async ({ task } = {}) => {
		if (!task?.id || task.project_id !== projectId) return;
		try {
			await refreshTaskCard(task.id);
		} catch (error) {
			console.error('Kanban task assignment update failed', error);
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
