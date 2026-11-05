//! controllers/kanban/tasks/activity.js

import { listTaskEventsForMember } from '../../../services/kanban/taskEvents.js';

export async function renderKanbanTaskActivity(req, res, next) {
	try {
		const result = await listTaskEventsForMember({
			taskId: req.params.taskId,
			userId: req.user.id,
		});
		if (!result) return res.sendStatus(404);
		return res.render('kanban/taskActivity', {
			titleKey: 'kanban:taskActivity',
			styles: ['kanban/main'],
			scripts: ['kanban/taskActivityLive'],
			...result,
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderKanbanTaskActivityEvents(req, res, next) {
	try {
		const result = await listTaskEventsForMember({
			taskId: req.params.taskId,
			userId: req.user.id,
		});
		if (!result) return res.sendStatus(404);
		return res.render('kanban/_task_activity_events', {
			layout: false,
			...result,
		});
	} catch (error) {
		return next(error);
	}
}
