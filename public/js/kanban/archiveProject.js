//! public/js/kanban/archiveProject.js

(() => {
	const modal = document.getElementById('archiveKanbanProjectModal');
	if (!modal) return;

	const projectIdInput = modal.querySelector('[data-archive-project-id]');
	const projectName = modal.querySelector('[data-archive-project-name]');

	modal.addEventListener('show.bs.modal', (event) => {
		const trigger = event.relatedTarget;
		const id = trigger?.dataset.projectId;
		if (!id) return event.preventDefault();
		projectIdInput.value = id;
		projectName.textContent = trigger.dataset.projectName || '';
	});

	modal.addEventListener('hidden.bs.modal', () => {
		projectIdInput.value = '';
		projectName.textContent = '';
	});
})();
