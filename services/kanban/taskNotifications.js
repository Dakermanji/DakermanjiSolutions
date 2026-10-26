//! services/kanban/taskNotifications.js

import logger from '../../config/logger.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import { createNotification } from '../notifications/appNotifications.js';

async function sendAssignmentNotifications({ taskId, actorUserId, taskTitle, recipients }) {
	for (const [recipientUserId, notificationType] of recipients) {
		try {
			const isNewAssignee = notificationType === 'assigned';
			const result = await createNotification({
				recipientUserId,
				actorUserId,
				appKey: NOTIFICATION_APP_KEYS.PROJECTS,
				type: isNewAssignee
					? NOTIFICATION_TYPES.KANBAN_TASK_ASSIGNED
					: NOTIFICATION_TYPES.KANBAN_TASK_REASSIGNED,
				entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_TASK,
				entityId: taskId,
				titleKey: `notifications:types.kanbanTask${isNewAssignee ? 'Assigned' : 'Reassigned'}.title`,
				bodyKey: `notifications:types.kanbanTask${isNewAssignee ? 'Assigned' : 'Reassigned'}.body`,
				linkUrl: `/kanban/tasks/${taskId}`,
				data: { taskTitle },
				priority: NOTIFICATION_PRIORITIES.HIGH,
			});
			if (!result.notification) {
				logger.warning('Kanban task assignment notification was not created', {
					type: 'kanban',
					taskId,
					recipientUserId,
					errors: result.errors,
				});
			}
		} catch (error) {
			logger.warning('Kanban task assignment notification failed', {
				type: 'kanban',
				taskId,
				recipientUserId,
				error,
			});
		}
	}
}

export function notifyTaskAssigned({ taskId, actorUserId, assigneeUserId, taskTitle }) {
	const recipients = new Map();
	if (assigneeUserId) recipients.set(assigneeUserId, 'assigned');
	return sendAssignmentNotifications({ taskId, actorUserId, taskTitle, recipients });
}

export function notifyTaskReassigned({
	taskId,
	actorUserId,
	ownerUserId,
	previousAssigneeUserId,
	newAssigneeUserId,
	taskTitle,
}) {
	const recipients = new Map();
	for (const userId of [ownerUserId, previousAssigneeUserId].filter(Boolean)) {
		recipients.set(userId, 'reassigned');
	}
	if (newAssigneeUserId) recipients.set(newAssigneeUserId, 'assigned');
	return sendAssignmentNotifications({ taskId, actorUserId, taskTitle, recipients });
}
