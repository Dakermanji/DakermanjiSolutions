//! controllers/kanban/tasks/actions.js

import { fail } from '../../../services/http/response.js';
import { changeTaskAssignee } from '../../../services/kanban/taskAssignments.js';
import { createTaskForProject } from '../../../services/kanban/taskCreation.js';
import { reorderTaskWithinStage } from '../../../services/kanban/taskOrdering.js';
import {
	archiveTaskWithLog,
	changeTaskStage,
	editTaskDetails,
	restoreTaskWithLog,
} from '../../../services/kanban/tasks.js';

export async function archiveKanbanTask(req, res, next) {
	try {
		const result = await archiveTaskWithLog(req.kanbanTaskArchiveInput);
		if (result.status === 'forbidden') return res.sendStatus(404);
		req.flash('success', 'kanban:taskArchived');
		return res.redirect(`/kanban/${result.task.project_id}`);
	} catch (error) {
		return next(error);
	}
}

export async function restoreKanbanTask(req, res, next) {
	try {
		const result = await restoreTaskWithLog(req.kanbanTaskRestoreInput);
		if (result.status === 'forbidden') return res.sendStatus(404);
		req.flash('success', 'kanban:taskRestored');
		return res.redirect(`/kanban/${result.task.project_id}/archived-tasks`);
	} catch (error) {
		return next(error);
	}
}

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

export async function changeKanbanTaskStage(req, res, next) {
	const { taskId } = req.kanbanTaskStageInput;
	try {
		const result = await changeTaskStage(req.kanbanTaskStageInput);
		if (result.status === 'forbidden') return res.sendStatus(404);
		if (req.kanbanTaskStageInput.returnToBoard && result.task?.project_id) {
			return res.redirect(`/kanban/${result.task.project_id}`);
		}
		return res.redirect(`/kanban/tasks/${taskId}`);
	} catch (error) {
		return next(error);
	}
}

export async function reorderKanbanTask(req, res, next) {
	try {
		const result = await reorderTaskWithinStage(req.kanbanTaskReorderInput);
		if (result.status === 'forbidden' || result.status === 'invalid_target') {
			return res.sendStatus(404);
		}
		return res.redirect(`/kanban/${result.task.project_id}`);
	} catch (error) {
		return next(error);
	}
}

export async function changeKanbanTaskAssignee(req, res, next) {
	const { taskId } = req.kanbanTaskAssignmentInput;
	try {
		const result = await changeTaskAssignee(req.kanbanTaskAssignmentInput);
		if (result.status === 'forbidden') return res.sendStatus(404);
		if (result.status === 'invalid_assignee') {
			return fail(req, res, 'kanban:error.invalidAssignee', {
				to: `/kanban/tasks/${taskId}`,
			});
		}
		return res.redirect(`/kanban/tasks/${taskId}`);
	} catch (error) {
		return next(error);
	}
}

export async function editKanbanTask(req, res, next) {
	const { taskId } = req.kanbanTaskEditInput;
	try {
		const result = await editTaskDetails(req.kanbanTaskEditInput);
		if (result.status === 'forbidden') return res.sendStatus(404);
		return res.redirect(`/kanban/tasks/${taskId}`);
	} catch (error) {
		return next(error);
	}
}
