//! models/kanban/TaskEvents.js

import { randomUUID } from 'node:crypto';
import { queryRows } from '../../config/database.js';
import { KANBAN_EVENT_LIMITS } from '../../constants/kanban.js';

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

export function listTaskEvents({
	taskId,
	viewerUserId,
	limit = KANBAN_EVENT_LIMITS.DEFAULT,
}) {
	return queryRows(
		`SELECT e.id, e.task_id, e.actor_user_id,
		        actor.username AS actor_username,
		        e.action, e.details, e.created_at
		 FROM kanban_task_events e
		 JOIN kanban_tasks t ON t.id = e.task_id
		 JOIN kanban_projects p ON p.id = t.project_id
		 JOIN kanban_project_members viewer
		   ON viewer.project_id = p.id AND viewer.user_id = $2
		 LEFT JOIN users actor ON actor.id = e.actor_user_id
		 WHERE e.task_id = $1 AND t.archived_at IS NULL
		   AND p.archived_at IS NULL
		 ORDER BY e.created_at DESC, e.id DESC
		 LIMIT $3`,
		[taskId, viewerUserId, limit],
	);
}
