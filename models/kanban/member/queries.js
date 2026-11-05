//! models/kanban/member/queries.js

export function findMembershipChangeProject(projectId, db) {
	return db.query(
		`SELECT id, owner_user_id
		 FROM kanban_projects
		 WHERE id = $1 AND archived_at IS NULL
		 FOR UPDATE`,
		[projectId],
	);
}

export function findProjectMemberForRemoval(projectId, targetUserId, db) {
	return db.query(
		`SELECT role FROM kanban_project_members
		 WHERE project_id = $1 AND user_id = $2 AND role <> 'owner'
		 FOR UPDATE`,
		[projectId, targetUserId],
	);
}

export function deleteProjectMember(projectId, targetUserId, db) {
	return db.query(
		`DELETE FROM kanban_project_members
		 WHERE project_id = $1 AND user_id = $2 AND role <> 'owner'
		 RETURNING user_id`,
		[projectId, targetUserId],
	);
}

export function unassignTasksForMember(projectId, targetUserId, db) {
	return db.query(
		`UPDATE kanban_tasks SET assignee_user_id = NULL, updated_at = NOW()
		 WHERE project_id = $1 AND assignee_user_id = $2
		 RETURNING id, title`,
		[projectId, targetUserId],
	);
}

export function listProjectManagerUserIds(projectId, db) {
	return db.query(
		`SELECT user_id
		 FROM kanban_project_members
		 WHERE project_id = $1 AND role IN ('owner', 'admin')`,
		[projectId],
	);
}
