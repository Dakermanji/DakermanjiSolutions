//! services/kanban/taskAssignments.js

import pool from '../../config/database.js';
import { createTaskEvent } from '../../models/kanban/TaskEvents.js';
import {
	findTaskAssignmentContext,
	findTaskAssigneeMembership,
	updateTaskAssignee,
} from '../../models/kanban/Tasks.js';
import { canBeAssigned, canManageTasks } from './permissions.js';

export async function changeTaskAssignee({ taskId, actorUserId, assigneeUserId }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const current = await findTaskAssignmentContext(taskId, actorUserId, client);
		if (!current || !canManageTasks(current.role)) {
			await client.query('ROLLBACK');
			return { status: 'forbidden', task: null };
		}
		if (assigneeUserId === undefined) {
			await client.query('ROLLBACK');
			return { status: 'invalid_assignee', task: null };
		}
		if (current.assignee_user_id === assigneeUserId) {
			await client.query('ROLLBACK');
			return { status: 'unchanged', task: current };
		}
		if (assigneeUserId !== null) {
			const assignee = await findTaskAssigneeMembership(
				current.project_id,
				assigneeUserId,
				client,
			);
			if (!assignee || !canBeAssigned(assignee.role)) {
				await client.query('ROLLBACK');
				return { status: 'invalid_assignee', task: null };
			}
		}

		const action = assigneeUserId === null
			? 'unassigned'
			: current.assignee_user_id ? 'reassigned' : 'assigned';
		const task = await updateTaskAssignee({
			taskId,
			projectId: current.project_id,
			assigneeUserId,
		}, client);
		await createTaskEvent({
			taskId,
			actorUserId,
			action,
			details: {
				previousAssigneeUserId: current.assignee_user_id,
				assigneeUserId,
			},
		}, client);
		await client.query('COMMIT');
		return {
			status: 'changed',
			action,
			task,
			previousAssigneeUserId: current.assignee_user_id,
			ownerUserId: current.owner_user_id,
			taskTitle: current.title,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
