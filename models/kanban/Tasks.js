//! models/kanban/Tasks.js

import { queryRows } from '../../config/database.js';

export function listTasksForProject(projectId, viewerUserId) {
	return queryRows(
		`SELECT t.id, t.project_id, t.title, t.description, t.status,
		        t.position, t.due_date, t.importance, t.creator_user_id,
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
