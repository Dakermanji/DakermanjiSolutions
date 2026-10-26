//! services/kanban/taskNotifications.js

import logger from '../../config/logger.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import { createNotification } from '../notifications/appNotifications.js';

export async function notifyTaskReassigned({
	taskId,
	actorUserId,
	ownerUserId,
	previousAssigneeUserId,
	taskTitle,
}) {
	const recipients = new Set([ownerUserId, previousAssigneeUserId].filter(Boolean));
	for (const recipientUserId of recipients) {
		try {
			const result = await createNotification({
				recipientUserId,
				actorUserId,
				appKey: NOTIFICATION_APP_KEYS.PROJECTS,
				type: NOTIFICATION_TYPES.KANBAN_TASK_REASSIGNED,
				entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_TASK,
				entityId: taskId,
				titleKey: 'notifications:types.kanbanTaskReassigned.title',
				bodyKey: 'notifications:types.kanbanTaskReassigned.body',
				linkUrl: `/kanban/tasks/${taskId}`,
				data: { taskTitle },
				priority: NOTIFICATION_PRIORITIES.HIGH,
			});
			if (!result.notification) {
				logger.warning('Kanban reassignment notification was not created', {
					type: 'kanban',
					taskId,
					recipientUserId,
					errors: result.errors,
				});
			}
		} catch (error) {
			logger.warning('Kanban reassignment notification failed', {
				type: 'kanban',
				taskId,
				recipientUserId,
				error,
			});
		}
	}
}
