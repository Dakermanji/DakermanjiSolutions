//! controllers/kanban/tasks.js

import { fail } from '../../services/http/response.js';
import { createTaskForProject } from '../../services/kanban/tasks.js';

export async function createKanbanTask(req, res, next) {
	const { projectId } = req.kanbanTaskInput;
	try {
		const result = await createTaskForProject(req.kanbanTaskInput);
		if (result.status === 'forbidden') return res.sendStatus(404);
		if (result.status === 'invalid_assignee') {
			return fail(req, res, 'kanban:error.invalidAssignee', {
				to: `/kanban/${projectId}`,
				modal: 'kanban_task',
			});
		}
		req.flash('success', 'kanban:taskCreated');
		return res.redirect(`/kanban/${projectId}`);
	} catch (error) {
		return next(error);
	}
}
