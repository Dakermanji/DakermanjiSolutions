//! middlewares/validators/kanban.js

import {
	KANBAN_INVITATION_LIMITS,
	KANBAN_PROJECT_LIMITS,
} from '../../constants/kanban.js';
import { KANBAN_ROLES } from '../../services/kanban/permissions.js';
import { fail } from '../../services/http/response.js';
import { isValidUuid } from './common.js';

const INVITABLE_ROLES = new Set([
	KANBAN_ROLES.ADMIN,
	KANBAN_ROLES.EDITOR,
	KANBAN_ROLES.OBSERVER,
]);

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
			to: `/kanban/${projectId}`,
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
