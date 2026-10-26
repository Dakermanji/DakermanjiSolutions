//! middlewares/validators/kanban/invitations.js

import { KANBAN_INVITATION_LIMITS, KANBAN_ROLES } from '../../../constants/kanban.js';
import { fail } from '../../../services/http/response.js';
import { isValidUuid } from '../common.js';

const INVITABLE_ROLES = new Set([
	KANBAN_ROLES.ADMIN,
	KANBAN_ROLES.EDITOR,
	KANBAN_ROLES.OBSERVER,
]);

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
