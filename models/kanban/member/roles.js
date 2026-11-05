//! models/kanban/member/roles.js

import { randomUUID } from 'node:crypto';
import pool from '../../../config/database.js';

export async function changeMemberRole({
	projectId,
	ownerUserId,
	targetUserId,
	role,
}) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const owner = await client.query(
			`SELECT 1 FROM kanban_projects
			 WHERE id = $1 AND owner_user_id = $2 AND archived_at IS NULL
			 FOR UPDATE`,
			[projectId, ownerUserId],
		);
		if (!owner.rowCount || targetUserId === ownerUserId) {
			await client.query('ROLLBACK');
			return false;
		}
		const membership = await client.query(
			`SELECT role FROM kanban_project_members
			 WHERE project_id = $1 AND user_id = $2 AND role <> 'owner'
			 FOR UPDATE`,
			[projectId, targetUserId],
		);
		const previousRole = membership.rows[0]?.role;
		if (!previousRole || previousRole === role) {
			await client.query('ROLLBACK');
			return false;
		}
		await client.query(
			`UPDATE kanban_project_members SET role = $1
			 WHERE project_id = $2 AND user_id = $3`,
			[role, projectId, targetUserId],
		);
		let unassignedTasks = [];
		let notificationRecipientUserIds = [];
		if (role === 'observer') {
			const unassigned = await client.query(
				`UPDATE kanban_tasks SET assignee_user_id = NULL, updated_at = NOW()
				 WHERE project_id = $1 AND assignee_user_id = $2
				 RETURNING id, title`,
				[projectId, targetUserId],
			);
			unassignedTasks = unassigned.rows;
			if (unassignedTasks.length) {
				const managers = await client.query(
					`SELECT user_id
					 FROM kanban_project_members
					 WHERE project_id = $1 AND role IN ('owner', 'admin')`,
					[projectId],
				);
				notificationRecipientUserIds = managers.rows.map((row) => row.user_id);
			}
		}
		await client.query(
			`INSERT INTO kanban_project_events
			 (id, project_id, actor_user_id, action, details)
			 VALUES ($1, $2, $3, 'member_role_changed', $4)`,
			[
				randomUUID(),
				projectId,
				ownerUserId,
				{ memberUserId: targetUserId, fromRole: previousRole, toRole: role },
			],
		);
		await client.query('COMMIT');
		return {
			changed: true,
			notificationRecipientUserIds,
			unassignedTasks,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
