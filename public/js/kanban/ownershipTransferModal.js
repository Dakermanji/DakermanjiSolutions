//! public/js/kanban/ownershipTransferModal.js

(() => {
	const modal = document.querySelector('#transferKanbanOwnershipModal');
	if (!modal) return;

	const targetId = modal.querySelector('[data-kanban-ownership-target-id]');
	const targetName = modal.querySelector('[data-kanban-ownership-target-name]');
	if (!targetId || !targetName) return;

	modal.addEventListener('show.bs.modal', (event) => {
		const trigger = event.relatedTarget;
		if (!trigger) return;
		targetId.value = trigger.dataset.memberId || '';
		targetName.textContent = trigger.dataset.memberName || '';
	});
})();
