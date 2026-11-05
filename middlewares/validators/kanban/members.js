//! middlewares/validators/kanban/members.js

import { KANBAN_ROLES } from '../../../constants/kanban.js';
import { fail } from '../../../services/http/response.js';
import { isValidUuid } from '../common.js';

const CHANGEABLE_ROLES = new Set([
	KANBAN_ROLES.ADMIN,
	KANBAN_ROLES.EDITOR,
	KANBAN_ROLES.OBSERVER,
]);

export function validateChangeMemberRole(req, res, next) {
	const { projectId, targetUserId, role } = req.body || {};
	if (!isValidUuid(projectId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	if (!isValidUuid(targetUserId) || !CHANGEABLE_ROLES.has(role)) {
		return fail(req, res, 'kanban:error.invalidMemberRole', {
			to: `/kanban/${projectId}/members`,
		});
	}
	req.kanbanMemberRoleInput = {
		projectId,
		ownerUserId: req.user.id,
		targetUserId,
		role,
	};
	return next();
}

export function validateTransferProjectOwnership(req, res, next) {
	const { projectId, targetUserId } = req.body || {};
	if (!isValidUuid(projectId) || !isValidUuid(targetUserId)) {
		return res.sendStatus(404);
	}
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);

	req.kanbanOwnershipTransferInput = {
		projectId,
		ownerUserId: req.user.id,
		targetUserId,
	};
	return next();
}

export function validateRemoveProjectMember(req, res, next) {
	const { projectId, targetUserId } = req.body || {};
	if (!isValidUuid(projectId) || !isValidUuid(targetUserId)) {
		return res.sendStatus(404);
	}
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);

	req.kanbanMemberRemovalInput = {
		projectId,
		ownerUserId: req.user.id,
		targetUserId,
	};
	return next();
}

export function validateLeaveProject(req, res, next) {
	const { projectId } = req.body || {};
	if (!isValidUuid(projectId)) return res.sendStatus(404);
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);

	req.kanbanProjectLeaveInput = {
		projectId,
		userId: req.user.id,
	};
	return next();
}
