//! models/kanban/TaskMessages.js

import { randomUUID } from 'node:crypto';
import { queryRows } from '../../config/database.js';
import { KANBAN_TASK_MESSAGE_LIMITS } from '../../constants/kanban.js';

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
		        message.edited_at, task.assignee_user_id,
		        (message.author_user_id = $2
		          AND message.deleted_at IS NULL
		          AND message.created_at >= NOW() - ($3::int * INTERVAL '1 millisecond')) AS can_edit
		 FROM kanban_task_messages message
		 JOIN kanban_tasks task ON task.id = message.task_id
		 JOIN kanban_projects project ON project.id = task.project_id
		 JOIN kanban_project_members viewer
		   ON viewer.project_id = project.id AND viewer.user_id = $2
		 LEFT JOIN users author ON author.id = message.author_user_id
		 WHERE message.task_id = $1 AND message.deleted_at IS NULL
		   AND task.archived_at IS NULL AND project.archived_at IS NULL
		 ORDER BY message.created_at ASC, message.id ASC`,
		[taskId, viewerUserId, KANBAN_TASK_MESSAGE_LIMITS.EDIT_WINDOW_MS],
	);
}

export async function updateOwnTaskMessage({
	messageId,
	taskId,
	authorUserId,
	body,
}, db) {
	const { rows } = await db.query(
		`UPDATE kanban_task_messages message
		 SET body = $4, edited_at = NOW()
		 FROM kanban_tasks task
		 JOIN kanban_projects project ON project.id = task.project_id
		 JOIN kanban_project_members author_membership
		   ON author_membership.project_id = project.id
		  AND author_membership.user_id = $3
		 WHERE message.id = $1 AND message.task_id = $2
		   AND message.author_user_id = $3
		   AND message.deleted_at IS NULL
		   AND message.body IS DISTINCT FROM $4
		   AND message.created_at >= NOW() - ($5::int * INTERVAL '1 millisecond')
		   AND task.id = message.task_id AND task.archived_at IS NULL
		   AND project.archived_at IS NULL
		 RETURNING message.id, message.task_id, message.author_user_id,
		           message.body, message.created_at, message.edited_at`,
		[
			messageId,
			taskId,
			authorUserId,
			body,
			KANBAN_TASK_MESSAGE_LIMITS.EDIT_WINDOW_MS,
		],
	);
	return rows[0] || null;
}
