//! services/kanban/taskOrdering.js

import pool from '../../config/database.js';
import {
	findTaskStageContext,
	listTaskIdsForStage,
	setTaskOrderForStage,
} from '../../models/kanban/Tasks.js';
import { canChangeTaskStage } from './permissions.js';
import { broadcastKanbanProjectEvent } from './live.js';

export async function reorderTaskWithinStage({
	taskId,
	actorUserId,
	targetTaskId,
	placement,
}) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const task = await findTaskStageContext(taskId, actorUserId, client);
		if (!task || !canChangeTaskStage(task.role, actorUserId, task.assignee_user_id)) {
			await client.query('ROLLBACK');
			return { status: 'forbidden', task: null };
		}
		if (taskId === targetTaskId) {
			await client.query('ROLLBACK');
			return { status: 'unchanged', task };
		}

		const taskIds = await listTaskIdsForStage({
			projectId: task.project_id,
			status: task.status,
		}, client);
		if (!taskIds.includes(targetTaskId)) {
			await client.query('ROLLBACK');
			return { status: 'invalid_target', task: null };
		}

		const orderedIds = taskIds.filter((id) => id !== taskId);
		const targetIndex = orderedIds.indexOf(targetTaskId);
		const insertionIndex = targetIndex + (placement === 'after' ? 1 : 0);
		orderedIds.splice(insertionIndex, 0, taskId);
		if (orderedIds.every((id, index) => id === taskIds[index])) {
			await client.query('ROLLBACK');
			return { status: 'unchanged', task };
		}

		await setTaskOrderForStage({
			projectId: task.project_id,
			status: task.status,
			taskIds: orderedIds,
		}, client);
		await client.query('COMMIT');
		broadcastKanbanProjectEvent(task.project_id, 'kanban:task:reordered', {
			taskId,
			actorUserId,
			status: task.status,
			orderedTaskIds: orderedIds,
		});
		return { status: 'reordered', task };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
