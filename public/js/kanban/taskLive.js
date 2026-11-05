//! public/js/kanban/taskLive.js

(() => {
	const page = document.querySelector('.kanban-page[data-kanban-task-id]');
	if (!page || typeof window.io !== 'function') return;

	const projectId = page.dataset.kanbanProjectId;
	const taskId = page.dataset.kanbanTaskId;
	if (!projectId || !taskId) return;

	const socket = window.io({ withCredentials: true });
	let taskDetailsRefreshVersion = 0;
	let taskDiscussionRefreshVersion = 0;

	async function refreshTaskDetails() {
		const version = ++taskDetailsRefreshVersion;
		const response = await fetch(`/kanban/tasks/${encodeURIComponent(taskId)}/details`, {
			credentials: 'same-origin',
		});
		if (!response.ok) return;

		const template = document.createElement('template');
		template.innerHTML = (await response.text()).trim();
		const updated = template.content.querySelector('section[aria-labelledby="task-details-title"]');
		const current = page.querySelector('section[aria-labelledby="task-details-title"]');
		if (!updated || !current?.isConnected || version !== taskDetailsRefreshVersion) return;

		current.querySelectorAll('[data-kanban-due-date]').forEach((icon) => {
			window.AppTooltips?.reset(icon);
		});
		current.replaceWith(updated);
		window.AppSelectDropdown?.initIn(updated);
		window.KanbanTaskChanges?.initIn(updated);
		window.AppTooltips?.initIn(updated);
	}

	async function refreshTaskDiscussion() {
		const version = ++taskDiscussionRefreshVersion;
		const response = await fetch(`/kanban/tasks/${encodeURIComponent(taskId)}/discussion`, {
			credentials: 'same-origin',
		});
		if (!response.ok) return;

		const template = document.createElement('template');
		template.innerHTML = (await response.text()).trim();
		const updated = template.content.querySelector('#task-discussion');
		const current = page.querySelector('#task-discussion');
		if (!updated || !current?.isConnected || version !== taskDiscussionRefreshVersion) return;
		const currentEditor = current.querySelector('#task-message-body');
		const updatedEditor = updated.querySelector('#task-message-body');
		if (currentEditor && updatedEditor) updatedEditor.innerHTML = currentEditor.innerHTML;

		current.replaceWith(updated);
		window.KanbanTaskMentions?.initIn(updated);
	}

	function updateTaskHeading(task) {
		const heading = page.querySelector('#task-title');
		if (heading) heading.textContent = task.title;
		const archiveButton = page.querySelector('[data-bs-target="#archiveKanbanTaskModal"]');
		if (archiveButton) {
			archiveButton.dataset.taskTitle = task.title;
			archiveButton.setAttribute(
				'aria-label',
				page.dataset.archiveTaskLabelTemplate.replace('__TASK_TITLE__', task.title),
			);
		}

		const editModal = document.querySelector('#editKanbanTaskModal');
		if (!editModal || editModal.classList.contains('show')) return;
		const titleInput = editModal.querySelector('[name="title"]');
		const descriptionInput = editModal.querySelector('[name="description"]');
		const dueDateInput = editModal.querySelector('[name="dueDate"]');
		const importanceInput = editModal.querySelector('[name="importance"]');
		if (titleInput) titleInput.value = task.title;
		if (descriptionInput) descriptionInput.value = task.description;
		if (dueDateInput) dueDateInput.value = task.due_date || '';
		if (importanceInput) {
			importanceInput.value = task.importance || '';
			importanceInput.dispatchEvent(new Event('change', { bubbles: true }));
		}
	}

	socket.on('kanban:task:edited', async ({ task } = {}) => {
		if (task?.id !== taskId || task.project_id !== projectId) return;
		updateTaskHeading(task);
		try {
			await refreshTaskDetails();
		} catch (error) {
			console.error('Kanban task detail refresh failed', error);
		}
	});

	for (const event of ['kanban:task:stage_changed', 'kanban:task:assignee_changed']) {
		socket.on(event, async ({ task } = {}) => {
			if (task?.id !== taskId || task.project_id !== projectId) return;
			try {
				await refreshTaskDetails();
			} catch (error) {
				console.error('Kanban task detail refresh failed', error);
			}
		});
	}

	for (const event of ['kanban:task:comment_created', 'kanban:task:comment_edited']) {
		socket.on(event, async ({ taskId: changedTaskId } = {}) => {
			if (changedTaskId !== taskId) return;
			try {
				await refreshTaskDiscussion();
			} catch (error) {
				console.error('Kanban task discussion refresh failed', error);
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
