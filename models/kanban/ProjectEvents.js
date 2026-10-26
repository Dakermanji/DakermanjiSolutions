//! models/kanban/ProjectEvents.js

import { randomUUID } from 'node:crypto';
import pool, { queryRows } from '../../config/database.js';
import { KANBAN_EVENT_LIMITS } from '../../constants/kanban.js';

export async function createProjectEvent({
	projectId,
	actorUserId = null,
	action,
	details = {},
}, db = pool) {
	const { rows } = await db.query(
		`INSERT INTO kanban_project_events
		 (id, project_id, actor_user_id, action, details)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, project_id, actor_user_id, action, details, created_at`,
		[randomUUID(), projectId, actorUserId, action, details],
	);
	return rows[0] || null;
}

export function listProjectEvents({ projectId, limit = KANBAN_EVENT_LIMITS.DEFAULT }) {
	return queryRows(
		`SELECT activity.event_type, activity.id, activity.project_id,
		        activity.actor_user_id, activity.actor_username, activity.action,
		        activity.details, activity.created_at, activity.task_title
		 FROM (
		   SELECT 'project'::text AS event_type,
		          e.id, e.project_id, e.actor_user_id,
		          actor.username AS actor_username,
		          e.action, e.details, e.created_at,
		          NULL::text AS task_title
		   FROM kanban_project_events e
		   LEFT JOIN users actor ON actor.id = e.actor_user_id
		   WHERE e.project_id = $1
		     AND e.action NOT IN ('invitation_requested', 'invitation_cancelled')

		   UNION ALL

		   SELECT 'task'::text AS event_type,
		          e.id, t.project_id, e.actor_user_id,
		          actor.username AS actor_username,
		          CASE WHEN e.action = 'status_changed' THEN 'done' ELSE e.action END AS action,
		          e.details, e.created_at, t.title AS task_title
		   FROM kanban_task_events e
		   JOIN kanban_tasks t ON t.id = e.task_id
		   LEFT JOIN users actor ON actor.id = e.actor_user_id
		   WHERE t.project_id = $1
		     AND (
		       e.action IN ('created', 'reassigned', 'unassigned', 'archived', 'restored')
		       OR (e.action = 'status_changed' AND e.details->>'toStatus' = 'done')
		     )
		 ) activity
		 ORDER BY activity.created_at DESC, activity.id DESC, activity.event_type
		 LIMIT $2`,
		[projectId, limit],
	);
}
