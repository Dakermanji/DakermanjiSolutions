//! controllers/kanban/taskMessages.js

import {
	editOwnTaskComment,
	postTaskMessage,
} from '../../services/kanban/taskMessages.js';

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

export async function editKanbanTaskMessage(req, res, next) {
	const { taskId } = req.kanbanTaskMessageEditInput;
	try {
		const result = await editOwnTaskComment(req.kanbanTaskMessageEditInput);
		if (result.status === 'not_editable') {
			req.flash('error', 'kanban:taskCommentNotEditable');
			return res.redirect(`/kanban/tasks/${taskId}#task-discussion`);
		}
		req.flash('success', 'kanban:taskCommentEdited');
		return res.redirect(`/kanban/tasks/${taskId}#task-discussion`);
	} catch (error) {
		return next(error);
	}
}
