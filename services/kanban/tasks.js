//! services/kanban/tasks.js

import pool from '../../config/database.js';
import { createTaskEvent } from '../../models/kanban/TaskEvents.js';
import {
	findTaskEditContext,
	findTaskStageContext,
	moveTaskToStage,
	updateTaskDetails,
} from '../../models/kanban/Tasks.js';
import { canChangeTaskStage, canManageTasks } from './permissions.js';

export async function changeTaskStage({ taskId, actorUserId, status }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const current = await findTaskStageContext(taskId, actorUserId, client);
		if (!current || !canChangeTaskStage(
			current.role,
			actorUserId,
			current.assignee_user_id,
		)) {
			await client.query('ROLLBACK');
			return { status: 'forbidden', task: null };
		}
		if (current.status === status) {
			await client.query('ROLLBACK');
			return { status: 'unchanged', task: current };
		}

		const task = await moveTaskToStage({
			taskId,
			projectId: current.project_id,
			status,
		}, client);
		await createTaskEvent({
			taskId,
			actorUserId,
			action: 'status_changed',
			details: { fromStatus: current.status, toStatus: status },
		}, client);
		await client.query('COMMIT');
		return { status: 'changed', task };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export async function editTaskDetails({
	taskId,
	actorUserId,
	title,
	description,
	dueDate,
	importance,
}) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const current = await findTaskEditContext(taskId, actorUserId, client);
		if (!current || !canManageTasks(current.role)) {
			await client.query('ROLLBACK');
			return { status: 'forbidden', task: null };
		}

		const changedFields = [];
		if (current.title !== title) changedFields.push('title');
		if (current.description !== description) changedFields.push('description');
		if (current.due_date !== dueDate) changedFields.push('dueDate');
		if (current.importance !== importance) changedFields.push('importance');
		if (changedFields.length === 0) {
			await client.query('ROLLBACK');
			return { status: 'unchanged', task: current };
		}

		const task = await updateTaskDetails({
			taskId,
			projectId: current.project_id,
			title,
			description,
			dueDate,
			importance,
		}, client);
		await createTaskEvent({
			taskId,
			actorUserId,
			action: 'edited',
			details: { changedFields },
		}, client);
		await client.query('COMMIT');
		return { status: 'edited', task };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
