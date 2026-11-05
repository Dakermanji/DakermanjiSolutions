//! models/kanban/member/ownership.js

import pool from '../../../config/database.js';
import { createProjectEvent } from '../ProjectEvents.js';

export async function transferProjectOwnership({
	projectId,
	ownerUserId,
	targetUserId,
}) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const project = await client.query(
			`SELECT owner_user_id FROM kanban_projects
			 WHERE id = $1 AND archived_at IS NULL
			 FOR UPDATE`,
			[projectId],
		);
		if (
			!project.rowCount ||
			project.rows[0].owner_user_id !== ownerUserId ||
			targetUserId === ownerUserId
		) {
			await client.query('ROLLBACK');
			return false;
		}

		const target = await client.query(
			`SELECT 1 FROM kanban_project_members
			 WHERE project_id = $1 AND user_id = $2 AND role <> 'owner'
			 FOR UPDATE`,
			[projectId, targetUserId],
		);
		if (!target.rowCount) {
			await client.query('ROLLBACK');
			return false;
		}

		const formerOwner = await client.query(
			`UPDATE kanban_project_members SET role = 'admin'
			 WHERE project_id = $1 AND user_id = $2 AND role = 'owner'`,
			[projectId, ownerUserId],
		);
		const nextOwner = await client.query(
			`UPDATE kanban_project_members SET role = 'owner'
			 WHERE project_id = $1 AND user_id = $2`,
			[projectId, targetUserId],
		);
		const projectUpdate = await client.query(
			`UPDATE kanban_projects SET owner_user_id = $1, updated_at = NOW()
			 WHERE id = $2`,
			[targetUserId, projectId],
		);
		if (!formerOwner.rowCount || !nextOwner.rowCount || !projectUpdate.rowCount) {
			await client.query('ROLLBACK');
			return false;
		}
		await createProjectEvent({
			projectId,
			actorUserId: ownerUserId,
			action: 'ownership_transferred',
			details: { memberUserId: targetUserId },
		}, client);
		await client.query('COMMIT');
		return true;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
