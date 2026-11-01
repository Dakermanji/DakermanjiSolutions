//! middlewares/validators/kanban/taskMessages.js

import { KANBAN_TASK_MESSAGE_LIMITS } from '../../../constants/kanban.js';
import { fail } from '../../../services/http/response.js';
import { isValidUuid } from '../common.js';

export function parseTaskMessageInput(input) {
	const body = typeof input?.body === 'string'
		? input.body.normalize('NFKC').trim()
		: '';

	return {
		values: { body },
		valid: body.length > 0 && body.length <= KANBAN_TASK_MESSAGE_LIMITS.BODY_MAX_LENGTH,
	};
}

export function validateCreateTaskMessage(req, res, next) {
	const taskId = req.body?.taskId;
	if (!isValidUuid(taskId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);

	const result = parseTaskMessageInput(req.body);
	if (!result.valid) {
		return fail(req, res, 'kanban:error.invalidTaskMessage', {
			to: `/kanban/tasks/${taskId}`,
		});
	}

	req.kanbanTaskMessageInput = {
		...result.values,
		taskId,
		authorUserId: req.user.id,
	};
	return next();
}

export function validateEditTaskMessage(req, res, next) {
	const taskId = req.body?.taskId;
	const messageId = req.body?.messageId;
	if (!isValidUuid(taskId) || !isValidUuid(messageId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);

	const result = parseTaskMessageInput(req.body);
	if (!result.valid) {
		return fail(req, res, 'kanban:error.invalidTaskMessage', {
			to: `/kanban/tasks/${taskId}#task-discussion`,
		});
	}

	req.kanbanTaskMessageEditInput = {
		...result.values,
		taskId,
		messageId,
		authorUserId: req.user.id,
	};
	return next();
}
