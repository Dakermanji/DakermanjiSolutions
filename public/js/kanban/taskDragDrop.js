//! public/js/kanban/taskDragDrop.js

(() => {
	const board = document.querySelector('[data-kanban-board]');
	if (!board) return;

	let draggedTask = null;

	board.addEventListener('dragstart', (event) => {
		const card = event.target.closest('[data-kanban-task-card][draggable="true"]');
		if (!card) return;
		draggedTask = card;
		card.classList.add('is-dragging');
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', card.dataset.taskId);
	});

	board.addEventListener('dragend', () => {
		draggedTask?.classList.remove('is-dragging');
		draggedTask = null;
		board.querySelectorAll('.is-drop-target').forEach((column) => {
			column.classList.remove('is-drop-target');
		});
	});

	board.querySelectorAll('[data-kanban-dropzone]').forEach((column) => {
		column.addEventListener('dragover', (event) => {
			if (!draggedTask || column.dataset.stage === draggedTask.dataset.taskStatus) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
			column.classList.add('is-drop-target');
		});

		column.addEventListener('dragleave', (event) => {
			if (!column.contains(event.relatedTarget)) column.classList.remove('is-drop-target');
		});

		column.addEventListener('drop', (event) => {
			if (!draggedTask || column.dataset.stage === draggedTask.dataset.taskStatus) return;
			event.preventDefault();
			const form = draggedTask.querySelector('[data-kanban-stage-form]');
			const statusInput = form?.querySelector('[data-kanban-stage-input]');
			if (!form || !statusInput) return;
			statusInput.value = column.dataset.stage;
			form.requestSubmit();
		});
	});
})();
