//! services/kanban/projectEvents.js

import {
	createProjectEvent,
	listProjectEvents,
} from '../../models/kanban/ProjectEvents.js';
import { findProjectForUser } from '../../models/kanban/Projects.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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
	limit = DEFAULT_LIMIT,
}) {
	const project = await findProjectForUser(projectId, userId);
	if (!project) return null;

	const pageSize = Number.isSafeInteger(limit)
		? Math.min(Math.max(limit, 1), MAX_LIMIT)
		: DEFAULT_LIMIT;
	return listProjectEvents({ projectId, limit: pageSize });
}
