//! models/kanban/Projects.js

import { randomUUID } from 'node:crypto';
import { queryRows } from '../../config/database.js';

export async function createProject({ ownerUserId, name, description }, db) {
	const id = randomUUID();
	const { rows } = await db.query(
		`INSERT INTO kanban_projects
		 (id, name, description, owner_user_id, created_by_user_id)
		 VALUES ($1, $2, $3, $4, $4)
		 RETURNING id, name, description`,
		[id, name, description, ownerUserId],
	);
	await db.query(
		`INSERT INTO kanban_project_members (project_id, user_id, role)
		 VALUES ($1, $2, 'owner')`,
		[id, ownerUserId],
	);
	return rows[0];
}

export function listProjectsForUser(userId) {
	return queryRows(
		`SELECT p.id, p.name, p.description, p.updated_at, m.role
		 FROM kanban_projects p
		 JOIN kanban_project_members m ON m.project_id = p.id
		 WHERE m.user_id = $1 AND p.archived_at IS NULL
		 ORDER BY p.updated_at DESC, p.name ASC`,
		[userId],
	);
}

export async function findProjectForUser(projectId, userId) {
	const rows = await queryRows(
		`SELECT p.id, p.name, p.description, p.owner_user_id,
		        p.created_at, p.updated_at, m.role
		 FROM kanban_projects p
		 JOIN kanban_project_members m ON m.project_id = p.id
		 WHERE p.id = $1 AND m.user_id = $2 AND p.archived_at IS NULL
		 LIMIT 1`,
		[projectId, userId],
	);
	return rows[0] || null;
}

export function listProjectMembers(projectId, viewerUserId) {
	return queryRows(
		`SELECT m.user_id, m.role, m.joined_at, u.username,
		        CASE WHEN viewer.role = 'owner' AND p.owner_user_id = viewer.user_id
		             THEN u.email ELSE NULL END AS email
		 FROM kanban_project_members viewer
		 JOIN kanban_projects p ON p.id = viewer.project_id
		 JOIN kanban_project_members m ON m.project_id = viewer.project_id
		 JOIN users u ON u.id = m.user_id
		 WHERE viewer.project_id = $1 AND viewer.user_id = $2
		   AND p.archived_at IS NULL
		 ORDER BY CASE m.role
		   WHEN 'owner' THEN 0 WHEN 'admin' THEN 1
		   WHEN 'editor' THEN 2 ELSE 3 END,
		   COALESCE(u.username, u.email) ASC`,
		[projectId, viewerUserId],
	);
}

export async function archiveProject({ projectId, ownerUserId }) {
	const rows = await queryRows(
		`UPDATE kanban_projects
		 SET archived_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND owner_user_id = $2 AND archived_at IS NULL
		 RETURNING id`,
		[projectId, ownerUserId],
	);
	return rows.length > 0;
}
