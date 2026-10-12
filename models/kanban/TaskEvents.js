//! models/kanban/TaskEvents.js

import { randomUUID } from 'node:crypto';

export async function createTaskEvent({
	taskId,
	actorUserId,
	action,
	details = {},
}, db) {
	const { rows } = await db.query(
		`INSERT INTO kanban_task_events
		 (id, task_id, actor_user_id, action, details)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, task_id, actor_user_id, action, details, created_at`,
		[randomUUID(), taskId, actorUserId, action, details],
	);
	return rows[0];
}
