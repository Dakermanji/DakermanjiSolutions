//! services/kanban/tasks.js

import pool from '../../config/database.js';
import { createTaskEvent } from '../../models/kanban/TaskEvents.js';
import {
	createTask,
	findTaskAssigneeMembership,
	findTaskCreatorMembership,
} from '../../models/kanban/Tasks.js';
import { canBeAssigned, canManageTasks } from './permissions.js';

export async function createTaskForProject(input) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const creator = await findTaskCreatorMembership(
			input.projectId,
			input.creatorUserId,
			client,
		);
		if (!creator || !canManageTasks(creator.role)) {
			await client.query('ROLLBACK');
			return { status: 'forbidden', task: null };
		}

		if (input.assigneeUserId) {
			const assignee = await findTaskAssigneeMembership(
				input.projectId,
				input.assigneeUserId,
				client,
			);
			if (!assignee || !canBeAssigned(assignee.role)) {
				await client.query('ROLLBACK');
				return { status: 'invalid_assignee', task: null };
			}
		}

		const task = await createTask(input, client);
		await createTaskEvent({
			taskId: task.id,
			actorUserId: input.creatorUserId,
			action: 'created',
		}, client);
		if (input.assigneeUserId) {
			await createTaskEvent({
				taskId: task.id,
				actorUserId: input.creatorUserId,
				action: 'assigned',
				details: { assigneeUserId: input.assigneeUserId },
			}, client);
		}
		await client.query('COMMIT');
		return { status: 'created', task };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
