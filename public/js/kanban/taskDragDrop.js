//! public/js/kanban/taskDragDrop.js

(() => {
	const board = document.querySelector('[data-kanban-board]');
	if (!board) return;

	let draggedTask = null;
	let reorderTarget = null;

	function clearReorderTarget() {
		reorderTarget?.classList.remove('is-reorder-before', 'is-reorder-after');
		reorderTarget = null;
	}

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
		clearReorderTarget();
	});

	board.querySelectorAll('[data-kanban-dropzone]').forEach((column) => {
		column.addEventListener('dragover', (event) => {
			if (!draggedTask) return;
			if (column.dataset.stage === draggedTask.dataset.taskStatus) {
				const target = event.target.closest('[data-kanban-task-card]');
				if (!target || target === draggedTask) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = 'move';
				column.classList.add('is-drop-target');
				clearReorderTarget();
				reorderTarget = target;
				const placement = event.clientY < target.getBoundingClientRect().top + target.offsetHeight / 2
					? 'before'
					: 'after';
				target.classList.add(`is-reorder-${placement}`);
				return;
			}
			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
			column.classList.add('is-drop-target');
		});

		column.addEventListener('dragleave', (event) => {
			if (!column.contains(event.relatedTarget)) column.classList.remove('is-drop-target');
		});

		column.addEventListener('drop', (event) => {
			if (!draggedTask) return;
			event.preventDefault();
			if (column.dataset.stage === draggedTask.dataset.taskStatus) {
				const target = event.target.closest('[data-kanban-task-card]');
				if (!target || target === draggedTask) return;
				const form = draggedTask.querySelector('[data-kanban-reorder-form]');
				const targetInput = form?.querySelector('[data-kanban-reorder-target]');
				const placementInput = form?.querySelector('[data-kanban-reorder-placement]');
				if (!form || !targetInput || !placementInput) return;
				targetInput.value = target.dataset.taskId;
				placementInput.value = event.clientY < target.getBoundingClientRect().top + target.offsetHeight / 2
					? 'before'
					: 'after';
				form.requestSubmit();
				return;
			}
			const form = draggedTask.querySelector('[data-kanban-stage-form]');
			const statusInput = form?.querySelector('[data-kanban-stage-input]');
			if (!form || !statusInput) return;
			statusInput.value = column.dataset.stage;
			form.requestSubmit();
		});
	});
})();
