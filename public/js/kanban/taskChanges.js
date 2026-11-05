//! public/js/kanban/taskChanges.js

(() => {
	function initTaskChangeForms(scope = document) {
		const forms = [
			...(scope.matches?.('[data-kanban-change-form]') ? [scope] : []),
			...scope.querySelectorAll('[data-kanban-change-form]'),
		];
		for (const form of forms) {
			const select = form.querySelector('[data-kanban-change-select]');
			const submit = form.querySelector('[data-kanban-change-submit]');
			if (!select || !submit || select.dataset.changeHandlerReady) continue;
			select.dataset.changeHandlerReady = 'true';

			const initialValue = select.dataset.initialValue || '';
			const updateSubmitVisibility = () => {
				submit.hidden = select.value === initialValue;
			};

			select.addEventListener('change', updateSubmitVisibility);
			updateSubmitVisibility();
		}
	}

	initTaskChangeForms();
	window.KanbanTaskChanges = { initIn: initTaskChangeForms };
})();
