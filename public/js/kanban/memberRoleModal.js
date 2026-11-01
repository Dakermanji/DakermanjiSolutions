//! public/js/kanban/memberRoleModal.js

(() => {
	const modal = document.querySelector('#changeKanbanMemberRoleModal');
	if (!modal) return;

	const form = modal.querySelector('[data-kanban-member-role-form]');
	const userIdInput = modal.querySelector('[data-kanban-member-id]');
	const memberName = modal.querySelector('[data-kanban-member-name]');
	const roleSelect = modal.querySelector('[data-kanban-member-role]');
	const submit = modal.querySelector('[data-kanban-member-role-submit]');
	if (!form || !userIdInput || !memberName || !roleSelect || !submit) return;

	const updateSubmitVisibility = () => {
		submit.hidden = roleSelect.value === roleSelect.dataset.initialValue;
	};

	roleSelect.addEventListener('change', updateSubmitVisibility);
	modal.addEventListener('show.bs.modal', (event) => {
		const trigger = event.relatedTarget;
		if (!trigger) return;
		userIdInput.value = trigger.dataset.memberId || '';
		memberName.textContent = trigger.dataset.memberName || '';
		roleSelect.value = trigger.dataset.memberRole || '';
		roleSelect.dataset.initialValue = roleSelect.value;
		roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
		updateSubmitVisibility();
	});
})();
