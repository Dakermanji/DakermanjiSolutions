//! services/kanban/memberRoles.js

import {
	changeMemberRole,
	transferProjectOwnership as transferProjectOwnershipQuery,
} from '../../models/kanban/Members.js';
import { notifyTasksUnassignedAfterMemberChange } from './taskNotifications.js';

export async function updateProjectMemberRole(input) {
	const result = await changeMemberRole(input);
	if (result?.unassignedTasks?.length) {
		await notifyTasksUnassignedAfterMemberChange({
			actorUserId: input.ownerUserId,
			recipientUserIds: result.notificationRecipientUserIds,
			tasks: result.unassignedTasks,
		});
	}
	return Boolean(result?.changed);
}

export function transferProjectOwnership(input) {
	return transferProjectOwnershipQuery(input);
}
