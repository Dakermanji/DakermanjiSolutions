//! services/kanban/memberRoles.js

import {
	changeMemberRole,
	transferProjectOwnership as transferProjectOwnershipQuery,
} from '../../models/kanban/Members.js';
import { broadcastKanbanProjectEvent } from './live.js';
import { notifyTasksUnassignedAfterMemberChange } from './taskNotifications.js';

export async function updateProjectMemberRole(input) {
	const result = await changeMemberRole(input);
	if (result?.changed) {
		broadcastKanbanProjectEvent(input.projectId, 'kanban:project:activity_changed', {
			projectId: input.projectId,
			actorUserId: input.ownerUserId,
		});
	}
	if (result?.unassignedTasks?.length) {
		await notifyTasksUnassignedAfterMemberChange({
			actorUserId: input.ownerUserId,
			recipientUserIds: result.notificationRecipientUserIds,
			tasks: result.unassignedTasks,
		});
	}
	return Boolean(result?.changed);
}

export async function transferProjectOwnership(input) {
	const transferred = await transferProjectOwnershipQuery(input);
	if (transferred) {
		broadcastKanbanProjectEvent(input.projectId, 'kanban:project:activity_changed', {
			projectId: input.projectId,
			actorUserId: input.ownerUserId,
		});
	}
	return transferred;
}
