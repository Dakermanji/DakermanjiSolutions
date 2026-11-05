//! public/js/kanban/live.js

(() => {
	const page = document.querySelector('.kanban-page[data-kanban-project-id]');
	if (!page || typeof window.io !== 'function') return;

	const projectId = page.dataset.kanbanProjectId;
	if (!projectId) return;

	const socket = window.io({ withCredentials: true });
	socket.on('connect', () => {
		socket.emit('kanban:project:join', { projectId }, (response) => {
			if (!response?.ok) socket.disconnect();
		});
	});

	window.addEventListener('pagehide', () => {
		socket.emit('kanban:project:leave', { projectId });
	}, { once: true });
})();
