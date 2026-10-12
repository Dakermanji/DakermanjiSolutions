//! models/kanban/Tasks.js

import { randomUUID } from 'node:crypto';
import { queryRows } from '../../config/database.js';

export async function findTaskCreatorMembership(projectId, creatorUserId, db) {
	const { rows } = await db.query(
		`SELECT creator.role
		 FROM kanban_projects p
		 JOIN kanban_project_members creator
		   ON creator.project_id = p.id AND creator.user_id = $2
		 WHERE p.id = $1 AND p.archived_at IS NULL
		 FOR UPDATE OF p, creator`,
		[projectId, creatorUserId],
	);
	return rows[0] || null;
}

export async function findTaskAssigneeMembership(projectId, assigneeUserId, db) {
	const { rows } = await db.query(
		`SELECT role FROM kanban_project_members
		 WHERE project_id = $1 AND user_id = $2
		 FOR SHARE`,
		[projectId, assigneeUserId],
	);
	return rows[0] || null;
}

export async function createTask({
	projectId,
	creatorUserId,
	title,
	description,
	dueDate,
	importance,
	assigneeUserId,
}, db) {
	const { rows } = await db.query(
		`INSERT INTO kanban_tasks
		 (id, project_id, title, description, position, due_date,
		  importance, creator_user_id, assignee_user_id)
		 VALUES ($1, $2, $3, $4,
		   (SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_tasks
		    WHERE project_id = $2 AND status = 'pending' AND archived_at IS NULL),
		   $5, $6, $7, $8)
		 RETURNING id, project_id, title, description, status, position,
		           due_date, importance, creator_user_id, assignee_user_id,
		           created_at, updated_at`,
		[
			randomUUID(), projectId, title, description, dueDate,
			importance, creatorUserId, assigneeUserId,
		],
	);
	return rows[0];
}

export function listTasksForProject(projectId, viewerUserId) {
	return queryRows(
		`SELECT t.id, t.project_id, t.title, t.description, t.status,
		        t.position, t.due_date::text AS due_date, t.importance, t.creator_user_id,
		        t.assignee_user_id, t.created_at, t.updated_at,
		        creator.username AS creator_username,
		        assignee.username AS assignee_username
		 FROM kanban_tasks t
		 JOIN kanban_projects p ON p.id = t.project_id
		 JOIN kanban_project_members viewer
		   ON viewer.project_id = t.project_id AND viewer.user_id = $2
		 LEFT JOIN users creator ON creator.id = t.creator_user_id
		 LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
		 WHERE t.project_id = $1 AND p.archived_at IS NULL
		   AND t.archived_at IS NULL
		 ORDER BY CASE t.status
		   WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
		   t.position ASC, t.created_at ASC, t.id ASC`,
		[projectId, viewerUserId],
	);
}

export async function findTaskForMember(taskId, viewerUserId) {
	const rows = await queryRows(
		`SELECT t.id, t.project_id, t.title, t.description, t.status,
		        t.position, t.due_date::text AS due_date, t.importance, t.creator_user_id,
		        t.assignee_user_id, t.created_at, t.updated_at,
		        p.name AS project_name, viewer.role AS viewer_role,
		        creator.username AS creator_username, creator.email AS creator_email,
		        assignee.username AS assignee_username, assignee.email AS assignee_email
		 FROM kanban_tasks t
		 JOIN kanban_projects p ON p.id = t.project_id
		 JOIN kanban_project_members viewer
		   ON viewer.project_id = t.project_id AND viewer.user_id = $2
		 LEFT JOIN users creator ON creator.id = t.creator_user_id
		 LEFT JOIN users assignee ON assignee.id = t.assignee_user_id
		 WHERE t.id = $1 AND t.archived_at IS NULL
		   AND p.archived_at IS NULL
		 LIMIT 1`,
		[taskId, viewerUserId],
	);
	return rows[0] || null;
}

export async function findTaskStageContext(taskId, actorUserId, db) {
	const { rows } = await db.query(
		`SELECT t.id, t.project_id, t.status, t.assignee_user_id,
		        actor.role
		 FROM kanban_projects p
		 JOIN kanban_tasks t ON t.project_id = p.id
		 JOIN kanban_project_members actor
		   ON actor.project_id = p.id AND actor.user_id = $2
		 WHERE t.id = $1 AND t.archived_at IS NULL
		   AND p.archived_at IS NULL
		 FOR UPDATE OF p, t, actor`,
		[taskId, actorUserId],
	);
	return rows[0] || null;
}

export async function findTaskEditContext(taskId, actorUserId, db) {
	const { rows } = await db.query(
		`SELECT t.id, t.project_id, t.title, t.description,
		        t.due_date::text AS due_date, t.importance, actor.role
		 FROM kanban_projects p
		 JOIN kanban_tasks t ON t.project_id = p.id
		 JOIN kanban_project_members actor
		   ON actor.project_id = p.id AND actor.user_id = $2
		 WHERE t.id = $1 AND t.archived_at IS NULL
		   AND p.archived_at IS NULL
		 FOR UPDATE OF p, t, actor`,
		[taskId, actorUserId],
	);
	return rows[0] || null;
}

export async function updateTaskDetails({
	taskId,
	projectId,
	title,
	description,
	dueDate,
	importance,
}, db) {
	const { rows } = await db.query(
		`UPDATE kanban_tasks
		 SET title = $3, description = $4, due_date = $5,
		     importance = $6, updated_at = NOW()
		 WHERE id = $1 AND project_id = $2 AND archived_at IS NULL
		 RETURNING id, project_id, title, description,
		           due_date::text AS due_date, importance, updated_at`,
		[taskId, projectId, title, description, dueDate, importance],
	);
	return rows[0] || null;
}

export async function moveTaskToStage({ taskId, projectId, status }, db) {
	const { rows } = await db.query(
		`UPDATE kanban_tasks
		 SET status = $3,
		     position = (
		       SELECT COALESCE(MAX(position), -1) + 1
		       FROM kanban_tasks
		       WHERE project_id = $2 AND status = $3 AND archived_at IS NULL
		     ),
		     updated_at = NOW()
		 WHERE id = $1 AND project_id = $2 AND archived_at IS NULL
		 RETURNING id, project_id, status, position, updated_at`,
		[taskId, projectId, status],
	);
	return rows[0] || null;
}
