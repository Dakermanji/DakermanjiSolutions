//! services/kanban/projectEvents.js

import { KANBAN_EVENT_LIMITS } from '../../constants/kanban.js';
import {
	createProjectEvent,
	listProjectEvents,
} from '../../models/kanban/ProjectEvents.js';
import { findProjectForUser } from '../../models/kanban/Projects.js';

export function recordProjectCreated({ projectId, ownerUserId }, db) {
	return createProjectEvent({
		projectId,
		actorUserId: ownerUserId,
		action: 'created',
	}, db);
}

export function recordProjectArchived({ projectId, ownerUserId }, db) {
	return createProjectEvent({
		projectId,
		actorUserId: ownerUserId,
		action: 'archived',
	}, db);
}

export function recordInvitationAccepted({ projectId, userId, role }, db) {
	return createProjectEvent({
		projectId,
		actorUserId: userId,
		action: 'invitation_accepted',
		details: { role },
	}, db);
}

export function recordInvitationExpired({ projectId }, db) {
	return createProjectEvent({
		projectId,
		action: 'invitation_expired',
	}, db);
}

export async function listProjectEventsForMember({
	projectId,
	userId,
	limit = KANBAN_EVENT_LIMITS.DEFAULT,
}) {
	const project = await findProjectForUser(projectId, userId);
	if (!project) return null;

	const pageSize = Number.isSafeInteger(limit)
		? Math.min(Math.max(limit, 1), KANBAN_EVENT_LIMITS.MAX)
		: KANBAN_EVENT_LIMITS.DEFAULT;
	return listProjectEvents({ projectId, limit: pageSize });
}
