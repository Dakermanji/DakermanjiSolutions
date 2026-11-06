//! services/kanban/taskNotifications.js

import logger from '../../config/logger.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import {
	createNotification,
	createNotificationIfNotExists,
} from '../notifications/appNotifications.js';

async function sendAssignmentNotifications({ taskId, actorUserId, taskTitle, recipients }) {
	for (const [recipientUserId, notificationType] of recipients) {
		if (!recipientUserId || recipientUserId === actorUserId) continue;
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

export async function notifyTaskCommentMentions({
	taskId,
	taskTitle,
	taskMessageId,
	actorUserId,
	actorUsername,
	recipientUserIds = [],
}) {
	const recipients = [...new Set(recipientUserIds)].filter(
		(userId) => userId && userId !== actorUserId,
	);
	if (!recipients.length) return;

	const results = await Promise.allSettled(
		recipients.map((recipientUserId) =>
			createNotificationIfNotExists({
				recipientUserId,
				actorUserId,
				appKey: NOTIFICATION_APP_KEYS.PROJECTS,
				type: NOTIFICATION_TYPES.KANBAN_TASK_MESSAGE_MENTION,
				entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_TASK_MESSAGE_MENTION,
				entityId: taskMessageId,
				titleKey: 'notifications:types.kanbanTaskMessageMention.title',
				bodyKey: 'notifications:types.kanbanTaskMessageMention.body',
				linkUrl: `/kanban/tasks/${taskId}#task-discussion`,
				data: { senderName: actorUsername, taskTitle },
				priority: NOTIFICATION_PRIORITIES.NORMAL,
			}),
		),
	);

	const failedCount = results.filter(
		(result) => result.status === 'rejected' || !result.value?.notification,
	).length;
	if (failedCount > 0) {
		logger.warning('Kanban task comment mention notification failed', {
			type: 'kanban',
			taskId,
			taskMessageId,
			failedCount,
		});
	}
}

export async function notifyTaskDetailsUpdated({
	taskId,
	taskTitle,
	actorUserId,
	assigneeUserId,
}) {
	if (!assigneeUserId || assigneeUserId === actorUserId) return;

	try {
		const result = await createNotification({
			recipientUserId: assigneeUserId,
			actorUserId,
			appKey: NOTIFICATION_APP_KEYS.PROJECTS,
			type: NOTIFICATION_TYPES.KANBAN_TASK_UPDATED,
			entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_TASK,
			entityId: taskId,
			titleKey: 'notifications:types.kanbanTaskUpdated.title',
			bodyKey: 'notifications:types.kanbanTaskUpdated.body',
			linkUrl: `/kanban/tasks/${taskId}`,
			data: { taskTitle },
			priority: NOTIFICATION_PRIORITIES.NORMAL,
		});
		if (!result.notification) {
			logger.warning('Kanban task update notification was not created', {
				type: 'kanban',
				taskId,
				assigneeUserId,
				errors: result.errors,
			});
		}
	} catch (error) {
		logger.warning('Kanban task update notification failed', {
			type: 'kanban',
			taskId,
			assigneeUserId,
			error,
		});
	}
}

export async function notifyTasksUnassignedAfterMemberChange({
	actorUserId,
	recipientUserIds = [],
	tasks = [],
}) {
	const recipients = [...new Set(recipientUserIds)].filter(
		(userId) => userId && userId !== actorUserId,
	);
	if (!recipients.length || !tasks.length) return;

	const deliveries = tasks.flatMap((task) =>
		recipients.map((recipientUserId) => ({ task, recipientUserId })),
	);
	const results = await Promise.allSettled(
		deliveries.map(({ task, recipientUserId }) =>
			createNotificationIfNotExists({
				recipientUserId,
				actorUserId,
				appKey: NOTIFICATION_APP_KEYS.PROJECTS,
				type: NOTIFICATION_TYPES.KANBAN_TASK_UNASSIGNED,
				entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_TASK,
				entityId: task.id,
				titleKey: 'notifications:types.kanbanTaskUnassigned.title',
				bodyKey: 'notifications:types.kanbanTaskUnassigned.body',
				linkUrl: `/kanban/tasks/${task.id}`,
				data: { taskTitle: task.title },
				priority: NOTIFICATION_PRIORITIES.NORMAL,
			}),
		),
	);

	const failedCount = results.filter(
		(result) => result.status === 'rejected' || !result.value?.notification,
	).length;
	if (failedCount > 0) {
		logger.warning('Kanban task unassignment notifications failed', {
			type: 'kanban',
			failedCount,
			taskIds: tasks.map((task) => task.id),
		});
	}
}
