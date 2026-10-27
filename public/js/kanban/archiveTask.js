//! public/js/kanban/archiveTask.js

(() => {
	const modal = document.getElementById('archiveKanbanTaskModal');
	if (!modal) return;

	const taskIdInput = modal.querySelector('[data-archive-task-id]');
	const taskTitle = modal.querySelector('[data-archive-task-title]');

	modal.addEventListener('show.bs.modal', (event) => {
		const trigger = event.relatedTarget;
		const id = trigger?.dataset.taskId;
		if (!id) return event.preventDefault();
		taskIdInput.value = id;
		taskTitle.textContent = trigger.dataset.taskTitle || '';
	});

	modal.addEventListener('hidden.bs.modal', () => {
		taskIdInput.value = '';
		taskTitle.textContent = '';
	});
})();
