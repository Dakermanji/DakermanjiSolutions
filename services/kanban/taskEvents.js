//! services/kanban/taskEvents.js

import { KANBAN_EVENT_LIMITS } from '../../constants/kanban.js';
import { listTaskEvents } from '../../models/kanban/TaskEvents.js';
import { findTaskForMember } from '../../models/kanban/Tasks.js';

export async function listTaskEventsForMember({
	taskId,
	userId,
	limit = KANBAN_EVENT_LIMITS.DEFAULT,
}) {
	const task = await findTaskForMember(taskId, userId);
	if (!task) return null;

	const pageSize = Number.isSafeInteger(limit)
		? Math.min(Math.max(limit, 1), KANBAN_EVENT_LIMITS.MAX)
		: KANBAN_EVENT_LIMITS.DEFAULT;
	const events = await listTaskEvents({
		taskId,
		viewerUserId: userId,
		limit: pageSize,
	});
	return { task, events };
}
