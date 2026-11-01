//! controllers/kanban/taskMessages.js

import { postTaskMessage } from '../../services/kanban/taskMessages.js';

export async function createKanbanTaskMessage(req, res, next) {
	const { taskId } = req.kanbanTaskMessageInput;
	try {
		const result = await postTaskMessage(req.kanbanTaskMessageInput);
		if (result.status === 'forbidden') return res.sendStatus(404);
		req.flash('success', 'kanban:taskMessagePosted');
		return res.redirect(`/kanban/tasks/${taskId}#task-discussion`);
	} catch (error) {
		return next(error);
	}
}
