//! middlewares/validators/kanban.js

import {
	KANBAN_INVITATION_LIMITS,
	KANBAN_PROJECT_LIMITS,
	KANBAN_TASK_LIMITS,
	KANBAN_TASK_STAGES,
} from '../../constants/kanban.js';
import { KANBAN_ROLES } from '../../services/kanban/permissions.js';
import { fail } from '../../services/http/response.js';
import { isValidUuid } from './common.js';

const INVITABLE_ROLES = new Set([
	KANBAN_ROLES.ADMIN,
	KANBAN_ROLES.EDITOR,
	KANBAN_ROLES.OBSERVER,
]);

const TASK_IMPORTANCE = new Set(['high', 'medium', 'low']);
const TASK_STAGES = new Set(Object.values(KANBAN_TASK_STAGES));

function isValidDateOnly(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseTaskInput(input) {
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
	const assigneeUserId = typeof source.assigneeUserId === 'string'
		? source.assigneeUserId.trim() || null
		: null;

	return {
		values: { title, description, dueDate, importance, assigneeUserId },
		valid: title.length > 0 && title.length <= KANBAN_TASK_LIMITS.TITLE_MAX_LENGTH &&
			(source.description == null || typeof source.description === 'string') &&
			description.length <= KANBAN_TASK_LIMITS.DESCRIPTION_MAX_LENGTH &&
			(source.dueDate == null || typeof source.dueDate === 'string') &&
			(dueDate === null || isValidDateOnly(dueDate)) &&
			(source.importance == null || typeof source.importance === 'string') &&
			(importance === null || TASK_IMPORTANCE.has(importance)) &&
			(source.assigneeUserId == null || typeof source.assigneeUserId === 'string') &&
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

export function parseProjectInput(input) {
	const source = input && typeof input === 'object' && !Array.isArray(input)
		? input
		: {};
	const name = typeof source.name === 'string'
		? source.name.normalize('NFKC').trim()
		: '';
	const description = typeof source.description === 'string'
		? source.description.normalize('NFKC').trim()
		: '';

	return {
		values: { name, description },
		valid: (source.description == null || typeof source.description === 'string') &&
			name.length > 0 && name.length <= KANBAN_PROJECT_LIMITS.NAME_MAX_LENGTH &&
			description.length <= KANBAN_PROJECT_LIMITS.DESCRIPTION_MAX_LENGTH,
	};
}

export function validateCreateProject(req, res, next) {
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	const result = parseProjectInput(req.body);
	if (!result.valid) {
		return fail(req, res, 'kanban:error.invalidProject', {
			to: '/kanban',
			modal: 'kanban_project',
		});
	}
	req.kanbanProjectInput = {
		...result.values,
		ownerUserId: req.user.id,
	};
	return next();
}

export function validateProjectId(req, res, next) {
	if (!isValidUuid(req.params?.projectId)) return res.sendStatus(404);
	return next();
}

export function validateTaskId(req, res, next) {
	if (!isValidUuid(req.params?.taskId)) return res.sendStatus(404);
	return next();
}

export function validateArchiveProject(req, res, next) {
	if (!isValidUuid(req.body?.projectId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	req.kanbanArchiveInput = {
		projectId: req.body.projectId,
		ownerUserId: req.user.id,
	};
	return next();
}

export function parseInvitationInput(input) {
	const source = input && typeof input === 'object' && !Array.isArray(input)
		? input
		: {};
	const identifier = typeof source.identifier === 'string'
		? source.identifier.normalize('NFKC').trim().toLowerCase()
		: '';

	return {
		values: { identifier, role: source.role },
		valid: identifier.length > 0 &&
			identifier.length <= KANBAN_INVITATION_LIMITS.IDENTIFIER_MAX_LENGTH &&
			INVITABLE_ROLES.has(source.role),
	};
}

export function validateInviteMember(req, res, next) {
	const projectId = req.body?.projectId;
	if (!isValidUuid(projectId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	const result = parseInvitationInput(req.body);
	if (!result.valid) {
		return fail(req, res, 'kanban:error.invalidInvitation', {
			to: `/kanban/${projectId}/members`,
			modal: 'kanban_invite',
		});
	}
	req.kanbanInvitationInput = {
		...result.values,
		projectId,
		ownerUserId: req.user.id,
	};
	return next();
}

export function validateAcceptInvitation(req, res, next) {
	if (!isValidUuid(req.body?.invitationId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	req.kanbanInvitationResponse = {
		invitationId: req.body.invitationId,
		userId: req.user.id,
		accept: true,
	};
	return next();
}

export function validateDeclineInvitation(req, res, next) {
	if (!isValidUuid(req.body?.invitationId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	req.kanbanInvitationResponse = {
		invitationId: req.body.invitationId,
		userId: req.user.id,
		accept: false,
	};
	return next();
}
