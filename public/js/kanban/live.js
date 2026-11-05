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

	function updateColumnCount(column) {
		const list = column.querySelector('.kanban-task-list');
		const count = list?.children.length || 0;
		const badge = column.querySelector('.kanban-column-heading .badge');
		if (badge) {
			badge.textContent = new Intl.NumberFormat(
				document.documentElement.lang || 'en',
			).format(count);
		}
		if (!count) {
			list?.remove();
			if (!column.querySelector('.kanban-column-empty')) {
				const empty = document.createElement('p');
				empty.className = 'kanban-column-empty';
				empty.textContent = page.dataset.noTasksInStage || '';
				column.append(empty);
			}
		} else {
			column.querySelector('.kanban-column-empty')?.remove();
		}
	}

	async function refreshTaskCards(taskIds) {
		await Promise.all([...new Set(taskIds)].map(async (taskId) => {
			try {
				await refreshTaskCard(taskId);
			} catch (error) {
				console.error('Kanban task neighbor refresh failed', error);
			}
		}));
	}

	function createOrderForm(template, taskId, targetTaskId, placement) {
		if (!template) return null;
		const form = template.cloneNode(true);
		form.querySelector('[name="taskId"]').value = taskId;
		form.querySelector('[name="targetTaskId"]').value = targetTaskId;
		form.querySelector('[name="placement"]').value = placement;
		const label = page.dataset[placement === 'before' ? 'moveTaskUp' : 'moveTaskDown'];
		const button = form.querySelector('button');
		button.setAttribute('aria-label', label);
		button.setAttribute('data-bs-title', label);
		button.querySelector('i').className = `bi bi-arrow-${placement === 'before' ? 'up' : 'down'}`;
		return form;
	}

	function updateTaskOrderControls(list, orderedCards) {
		const templates = {
			before: list.querySelector('.kanban-task-card-order input[name="placement"][value="before"]')?.closest('form'),
			after: list.querySelector('.kanban-task-card-order input[name="placement"][value="after"]')?.closest('form'),
		};
		for (const [index, card] of orderedCards.entries()) {
			const group = card.querySelector('.kanban-task-card-order');
			if (!group) continue;
			group.querySelectorAll('button.has-tooltip').forEach((button) => {
				window.AppTooltips?.reset(button);
			});
			const forms = [];
			if (index > 0) {
				forms.push(createOrderForm(
					templates.before || templates.after,
					card.dataset.taskId,
					orderedCards[index - 1].dataset.taskId,
					'before',
				));
			}
			if (index < orderedCards.length - 1) {
				forms.push(createOrderForm(
					templates.after || templates.before,
					card.dataset.taskId,
					orderedCards[index + 1].dataset.taskId,
					'after',
				));
			}
			group.replaceChildren(...forms.filter(Boolean));
			window.AppTooltips?.initIn(group);
		}
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

	socket.on('kanban:task:stage_changed', async ({ task } = {}) => {
		if (!board || !task?.id || task.project_id !== projectId) return;
		const card = board.querySelector(
			`[data-kanban-task-card][data-task-id="${CSS.escape(task.id)}"]`,
		);
		const targetColumn = board.querySelector(
			`[data-kanban-dropzone][data-stage="${task.status}"]`,
		);
		const targetList = targetColumn?.querySelector('.kanban-task-list');
		if (!card || !targetColumn || card.dataset.taskStatus === task.status) return;

		const sourceColumn = card.closest('[data-kanban-dropzone]');
		const neighborIds = [
			card.previousElementSibling?.dataset.taskId,
			card.nextElementSibling?.dataset.taskId,
			targetList?.lastElementChild?.dataset.taskId,
		].filter(Boolean);
		try {
			const [updatedCard] = await Promise.all([
				fetchTaskCard(task.id),
				refreshTaskCards(neighborIds),
			]);
			if (!updatedCard || !card.isConnected || !page.isConnected) return;

			window.AppTooltips?.reset(card);
			card.remove();
			let destinationList = targetColumn.querySelector('.kanban-task-list');
			if (!destinationList) {
				destinationList = document.createElement('ul');
				destinationList.className = 'kanban-task-list';
				targetColumn.querySelector('.kanban-column-empty')?.remove();
				targetColumn.append(destinationList);
			}
			destinationList.append(updatedCard);
			[...destinationList.children]
				.sort((left, right) => Number(left.dataset.taskPosition) - Number(right.dataset.taskPosition))
				.forEach((item) => destinationList.append(item));
			updateColumnCount(sourceColumn);
			updateColumnCount(targetColumn);
			window.AppTooltips?.initIn(updatedCard);
		} catch (error) {
			console.error('Kanban task stage update failed', error);
		}
	});

	socket.on('kanban:task:reordered', ({ status, orderedTaskIds } = {}) => {
		if (!board || !Array.isArray(orderedTaskIds)) return;
		const column = board.querySelector(`[data-kanban-dropzone][data-stage="${status}"]`);
		const list = column?.querySelector('.kanban-task-list');
		if (!list) return;

		const cardsById = new Map(
			[...list.children].map((card) => [card.dataset.taskId, card]),
		);
		for (const taskId of orderedTaskIds) {
			const card = cardsById.get(taskId);
			if (card) {
				list.append(card);
				cardsById.delete(taskId);
			}
		}
		for (const card of cardsById.values()) list.append(card);
		updateTaskOrderControls(list, [...list.children]);
	});

	socket.on('kanban:task:archived', async ({ task } = {}) => {
		if (!board || !task?.id || task.project_id !== projectId) return;
		const card = board.querySelector(
			`[data-kanban-task-card][data-task-id="${CSS.escape(task.id)}"]`,
		);
		if (!card) return;

		const column = card.closest('[data-kanban-dropzone]');
		const neighborIds = [
			card.previousElementSibling?.dataset.taskId,
			card.nextElementSibling?.dataset.taskId,
		].filter(Boolean);
		window.AppTooltips?.reset(card);
		card.remove();
		updateColumnCount(column);
		await refreshTaskCards(neighborIds);
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
