//! services/kanban/taskDueNotifications.js

import logger from '../../config/logger.js';
import {
	KANBAN_TASK_DUE_NOTIFICATION_INTERVAL_MS,
} from '../../constants/kanban.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import { listTasksDueForNotifications } from '../../models/kanban/Tasks.js';
import { createNotificationIfNotExists } from '../notifications/appNotifications.js';

export async function notifyMembersAboutTaskDueDates() {
	const tasks = await listTasksDueForNotifications({
		appKey: NOTIFICATION_APP_KEYS.PROJECTS,
		entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_TASK,
		dueSoonType: NOTIFICATION_TYPES.KANBAN_TASK_DUE_SOON,
		overdueType: NOTIFICATION_TYPES.KANBAN_TASK_OVERDUE,
	});
	for (const task of tasks) {
		const isOverdue = task.due_state === 'overdue';
		const recipients = new Set([task.owner_user_id, task.assignee_user_id].filter(Boolean));
		const results = await Promise.allSettled(
			[...recipients].map((recipientUserId) =>
				createNotificationIfNotExists({
					recipientUserId,
					appKey: NOTIFICATION_APP_KEYS.PROJECTS,
					type: isOverdue
						? NOTIFICATION_TYPES.KANBAN_TASK_OVERDUE
						: NOTIFICATION_TYPES.KANBAN_TASK_DUE_SOON,
					entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_TASK,
					entityId: task.id,
					titleKey: `notifications:types.kanbanTask${isOverdue ? 'Overdue' : 'DueSoon'}.title`,
					bodyKey: `notifications:types.kanbanTask${isOverdue ? 'Overdue' : 'DueSoon'}.body`,
					linkUrl: `/kanban/tasks/${task.id}`,
					data: { taskTitle: task.title },
					priority: isOverdue
						? NOTIFICATION_PRIORITIES.HIGH
						: NOTIFICATION_PRIORITIES.NORMAL,
				}),
			),
		);
		const failedCount = results.filter((result) => result.status === 'rejected').length;
		if (failedCount > 0) {
			logger.warning('Kanban due date notification dispatch failed', {
				type: 'kanban',
				taskId: task.id,
				failedCount,
			});
		}
	}
}

export function startKanbanTaskDueNotificationScheduler({
	intervalMs = KANBAN_TASK_DUE_NOTIFICATION_INTERVAL_MS,
	schedule = setInterval,
	unschedule = clearInterval,
} = {}) {
	let stopped = false;
	let running = false;
	const checkDueTasks = async () => {
		if (stopped || running) return;
		running = true;
		try {
			await notifyMembersAboutTaskDueDates();
		} catch (error) {
			logger.warning('Kanban due date notification check failed', {
				type: 'kanban',
				error,
			});
		} finally {
			running = false;
		}
	};

	void checkDueTasks();
	const timer = schedule(() => { void checkDueTasks(); }, intervalMs);
	timer.unref?.();
	return () => {
		stopped = true;
		unschedule(timer);
	};
}
