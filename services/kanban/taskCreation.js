//! services/kanban/taskCreation.js

import pool from '../../config/database.js';
import logger from '../../config/logger.js';
import { createTaskEvent } from '../../models/kanban/TaskEvents.js';
import {
	createTask,
	findTaskAssigneeMembership,
	findTaskCreatorMembership,
} from '../../models/kanban/Tasks.js';
import { canBeAssigned, canManageTasks } from './permissions.js';
import { notifyTaskAssigned } from './taskNotifications.js';

export async function createTaskForProject(input) {
	const client = await pool.connect();
	let result;
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
		result = { status: 'created', task };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}

	if (result.task.assignee_user_id) {
		try {
			await notifyTaskAssigned({
				taskId: result.task.id,
				actorUserId: input.creatorUserId,
				assigneeUserId: result.task.assignee_user_id,
				taskTitle: result.task.title,
			});
		} catch (error) {
			logger.warning('Kanban task assignment notification dispatch failed', {
				type: 'kanban',
				taskId: result.task.id,
				error,
			});
		}
	}
	return result;
}
