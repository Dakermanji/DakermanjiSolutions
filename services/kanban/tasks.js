//! services/kanban/tasks.js

import pool from '../../config/database.js';
import { createTaskEvent } from '../../models/kanban/TaskEvents.js';
import {
	createTask,
	findTaskAssignmentContext,
	findTaskAssigneeMembership,
	findTaskCreatorMembership,
	findTaskEditContext,
	findTaskStageContext,
	moveTaskToStage,
	updateTaskAssignee,
	updateTaskDetails,
} from '../../models/kanban/Tasks.js';
import { canBeAssigned, canChangeTaskStage, canManageTasks } from './permissions.js';

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
