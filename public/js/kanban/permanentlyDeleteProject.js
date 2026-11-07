//! public/js/kanban/permanentlyDeleteProject.js

(() => {
	const modal = document.getElementById('permanentlyDeleteKanbanProjectModal');
	if (!modal) return;

	const projectIdInput = modal.querySelector('[data-permanent-delete-project-id]');
	const projectName = modal.querySelector('[data-permanent-delete-project-name]');
	const confirmationInput = modal.querySelector('[data-permanent-delete-confirmation]');
	const submitButton = modal.querySelector('[data-permanent-delete-submit]');
	const form = modal.querySelector('[data-permanent-delete-project-form]');
	let expectedProjectName = '';

	function updateSubmitState() {
		const confirmationName = confirmationInput.value.normalize('NFKC').trim();
		submitButton.disabled = confirmationName !== expectedProjectName;
	}

	modal.addEventListener('show.bs.modal', (event) => {
		const trigger = event.relatedTarget;
		const id = trigger?.dataset.projectId;
		if (!id) return event.preventDefault();

		expectedProjectName = (trigger.dataset.projectName || '').normalize('NFKC').trim();
		projectIdInput.value = id;
		projectName.textContent = expectedProjectName;
		confirmationInput.value = '';
		updateSubmitState();
	});

	confirmationInput.addEventListener('input', updateSubmitState);
	form.addEventListener('submit', (event) => {
		updateSubmitState();
		if (submitButton.disabled) event.preventDefault();
	});

	modal.addEventListener('hidden.bs.modal', () => {
		projectIdInput.value = '';
		projectName.textContent = '';
		confirmationInput.value = '';
		expectedProjectName = '';
		updateSubmitState();
	});
})();
