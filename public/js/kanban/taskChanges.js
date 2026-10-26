//! public/js/kanban/taskChanges.js

(() => {
	const forms = document.querySelectorAll('[data-kanban-change-form]');
	for (const form of forms) {
		const select = form.querySelector('[data-kanban-change-select]');
		const submit = form.querySelector('[data-kanban-change-submit]');
		if (!select || !submit) continue;

		const initialValue = select.dataset.initialValue || '';
		const updateSubmitVisibility = () => {
			submit.hidden = select.value === initialValue;
		};

		select.addEventListener('change', updateSubmitVisibility);
		updateSubmitVisibility();
	}
})();
