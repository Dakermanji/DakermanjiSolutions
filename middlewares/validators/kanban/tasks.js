//! middlewares/validators/kanban/tasks.js

import { KANBAN_TASK_LIMITS, KANBAN_TASK_STAGES } from '../../../constants/kanban.js';
import { fail } from '../../../services/http/response.js';
import { isValidDateOnly, isValidUuid } from '../common.js';

const TASK_IMPORTANCE = new Set(['high', 'medium', 'low']);
const TASK_STAGES = new Set(Object.values(KANBAN_TASK_STAGES));

export function parseTaskDetailsInput(input) {
	const source = input && typeof input === 'object' && !Array.isArray(input)
		? input
		: {};
	const title = typeof source.title === 'string'
		? source.title.normalize('NFKC').trim()
		: '';
	const description = typeof source.description === 'string'
		? source.description.normalize('NFKC').trim()
		: '';
	const dueDate = typeof source.dueDate === 'string'
		? source.dueDate.trim() || null
		: null;
	const importance = typeof source.importance === 'string'
		? source.importance.trim() || null
		: null;

	return {
		values: { title, description, dueDate, importance },
		valid: title.length > 0 && title.length <= KANBAN_TASK_LIMITS.TITLE_MAX_LENGTH &&
			(source.description == null || typeof source.description === 'string') &&
			description.length <= KANBAN_TASK_LIMITS.DESCRIPTION_MAX_LENGTH &&
			(source.dueDate == null || typeof source.dueDate === 'string') &&
			(dueDate === null || isValidDateOnly(dueDate)) &&
			(source.importance == null || typeof source.importance === 'string') &&
			(importance === null || TASK_IMPORTANCE.has(importance)),
	};
}

export function parseTaskInput(input) {
	const details = parseTaskDetailsInput(input);
	const assigneeUserId = typeof input?.assigneeUserId === 'string'
		? input.assigneeUserId.trim() || null
		: null;
	return {
		values: { ...details.values, assigneeUserId },
		valid: details.valid &&
			(input?.assigneeUserId == null || typeof input.assigneeUserId === 'string') &&
			(assigneeUserId === null || isValidUuid(assigneeUserId)),
	};
}

export function validateCreateTask(req, res, next) {
	const projectId = req.body?.projectId;
	if (!isValidUuid(projectId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	const result = parseTaskInput(req.body);
	if (!result.valid) {
		return fail(req, res, 'kanban:error.invalidTask', {
			to: `/kanban/${projectId}`,
			modal: 'kanban_task',
		});
	}
	req.kanbanTaskInput = {
		...result.values,
		projectId,
		creatorUserId: req.user.id,
	};
	return next();
}

export function validateEditTask(req, res, next) {
	const taskId = req.body?.taskId;
	if (!isValidUuid(taskId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	const result = parseTaskDetailsInput(req.body);
	if (!result.valid ||
		typeof req.body.description !== 'string' ||
		typeof req.body.dueDate !== 'string' ||
		typeof req.body.importance !== 'string') {
		return fail(req, res, 'kanban:error.invalidTask', {
			to: `/kanban/tasks/${taskId}`,
			modal: 'kanban_edit_task',
		});
	}
	req.kanbanTaskEditInput = {
		...result.values,
		taskId,
		actorUserId: req.user.id,
	};
	return next();
}

export function validateChangeTaskStage(req, res, next) {
	const taskId = req.body?.taskId;
	if (!isValidUuid(taskId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	const status = req.body?.status;
	if (!TASK_STAGES.has(status)) {
		return fail(req, res, 'kanban:error.invalidTaskStage', {
			to: `/kanban/tasks/${taskId}`,
		});
	}
	req.kanbanTaskStageInput = { taskId, actorUserId: req.user.id, status };
	return next();
}

export function validateChangeTaskAssignee(req, res, next) {
	const taskId = req.body?.taskId;
	if (!isValidUuid(taskId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	const rawAssignee = req.body?.assigneeUserId;
	const assigneeUserId = typeof rawAssignee === 'string'
		? rawAssignee.trim() || null
		: undefined;
	if (assigneeUserId === undefined ||
		(assigneeUserId !== null && !isValidUuid(assigneeUserId))) {
		return fail(req, res, 'kanban:error.invalidAssignee', {
			to: `/kanban/tasks/${taskId}`,
		});
	}
	req.kanbanTaskAssignmentInput = {
		taskId,
		actorUserId: req.user.id,
		assigneeUserId,
	};
	return next();
}

export function validateTaskId(req, res, next) {
	if (!isValidUuid(req.params?.taskId)) return res.sendStatus(404);
	return next();
}
