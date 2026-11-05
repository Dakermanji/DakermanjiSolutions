//! services/kanban/live.js

import { isValidUuid } from '../../middlewares/validators/common.js';
import { findProjectForUser } from '../../models/kanban/Projects.js';

let kanbanSocketServer = null;

export function setKanbanSocketServer(io) {
	kanbanSocketServer = io;
}

export function getKanbanProjectRoom(projectId) {
	return `kanban:project:${projectId}`;
}

export function removeKanbanProjectRoom(projectId) {
	if (!kanbanSocketServer) return;
	return kanbanSocketServer
		.in(getKanbanProjectRoom(projectId))
		.socketsLeave(getKanbanProjectRoom(projectId));
}

export function registerKanbanSocketHandlers(socket) {
	socket.on('kanban:project:join', async (payload, acknowledge) => {
		const projectId = String(payload?.projectId || '').trim();
		if (!isValidUuid(projectId)) {
			acknowledge?.({ ok: false });
			return;
		}

		const room = getKanbanProjectRoom(projectId);
		try {
			const project = await findProjectForUser(projectId, socket.data.userId);
			if (!project) {
				await socket.leave(room);
				acknowledge?.({ ok: false });
				return;
			}

			await socket.join(room);
			acknowledge?.({ ok: true });
		} catch {
			await socket.leave(room);
			acknowledge?.({ ok: false });
		}
	});

	socket.on('kanban:project:leave', async (payload, acknowledge) => {
		const projectId = String(payload?.projectId || '').trim();
		if (!isValidUuid(projectId)) {
			acknowledge?.({ ok: false });
			return;
		}

		await socket.leave(getKanbanProjectRoom(projectId));
		acknowledge?.({ ok: true });
	});
}
