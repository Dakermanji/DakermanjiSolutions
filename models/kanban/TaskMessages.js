//! models/kanban/TaskMessages.js

import { randomUUID } from 'node:crypto';
import { queryRows } from '../../config/database.js';

export async function createTaskMessage({ taskId, authorUserId, body }, db) {
	const { rows } = await db.query(
		`INSERT INTO kanban_task_messages
		 (id, task_id, author_user_id, author_role, body)
		 SELECT $1, task.id, member.user_id, member.role, $4
		 FROM kanban_tasks task
		 JOIN kanban_projects project ON project.id = task.project_id
		 JOIN kanban_project_members member
		   ON member.project_id = project.id AND member.user_id = $3
		 WHERE task.id = $2 AND task.archived_at IS NULL
		   AND project.archived_at IS NULL
		 RETURNING id, task_id, author_user_id, author_role, body,
		           created_at, edited_at, deleted_at`,
		[randomUUID(), taskId, authorUserId, body],
	);
	return rows[0] || null;
}

export function listTaskMessages({ taskId, viewerUserId }) {
	return queryRows(
		`SELECT message.id, message.task_id, message.author_user_id,
		        author.username AS author_username,
		        message.author_role, message.body, message.created_at,
		        message.edited_at
		 FROM kanban_task_messages message
		 JOIN kanban_tasks task ON task.id = message.task_id
		 JOIN kanban_projects project ON project.id = task.project_id
		 JOIN kanban_project_members viewer
		   ON viewer.project_id = project.id AND viewer.user_id = $2
		 LEFT JOIN users author ON author.id = message.author_user_id
		 WHERE message.task_id = $1 AND message.deleted_at IS NULL
		   AND task.archived_at IS NULL AND project.archived_at IS NULL
		 ORDER BY message.created_at ASC, message.id ASC`,
		[taskId, viewerUserId],
	);
}
