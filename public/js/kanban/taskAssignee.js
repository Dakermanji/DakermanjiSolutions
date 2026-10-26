//! public/js/kanban/taskAssignee.js

(() => {
	const form = document.querySelector('[data-kanban-assignee-form]');
	if (!form) return;

	const select = form.querySelector('[data-kanban-assignee-select]');
	const submit = form.querySelector('[data-kanban-assignee-submit]');
	if (!select || !submit) return;

	const initialAssignee = select.dataset.initialAssignee || '';
	const updateSubmitVisibility = () => {
		submit.hidden = select.value === initialAssignee;
	};

	select.addEventListener('change', updateSubmitVisibility);
	updateSubmitVisibility();
})();
