//! models/kanban/ProjectEvents.js

import { randomUUID } from 'node:crypto';
import pool, { queryRows } from '../../config/database.js';

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

export function listProjectEvents({ projectId, includeInvitationEvents = false, limit = 50 }) {
	return queryRows(
		`SELECT e.id, e.project_id, e.actor_user_id, actor.username AS actor_username,
		        e.action, e.details, e.created_at
		 FROM kanban_project_events e
		 LEFT JOIN users actor ON actor.id = e.actor_user_id
		 WHERE e.project_id = $1
		   AND ($2::boolean OR e.action NOT IN ('invitation_requested', 'invitation_cancelled'))
		 ORDER BY e.created_at DESC, e.id DESC
		 LIMIT $3`,
		[projectId, includeInvitationEvents, limit],
	);
}
