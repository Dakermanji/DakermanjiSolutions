//! services/kanban/taskMessages.js

import pool from '../../config/database.js';
import { createTaskMessage, listTaskMessages } from '../../models/kanban/TaskMessages.js';
import { findTaskForMember } from '../../models/kanban/Tasks.js';

export async function listTaskMessagesForMember({ taskId, viewerUserId }) {
	const task = await findTaskForMember(taskId, viewerUserId);
	if (!task) return null;

	const messages = await listTaskMessages({ taskId, viewerUserId });
	return { task, messages };
}

export async function postTaskMessage({ taskId, authorUserId, body }) {
	const message = await createTaskMessage({ taskId, authorUserId, body }, pool);
	if (!message) return { status: 'forbidden', message: null };
	return { status: 'created', message };
}
