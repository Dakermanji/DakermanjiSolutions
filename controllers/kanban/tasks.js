//! controllers/kanban/tasks.js

import { KANBAN_TASK_LIMITS, KANBAN_TASK_STAGES } from '../../constants/kanban.js';
import { findTaskForMember } from '../../models/kanban/Tasks.js';
import { fail } from '../../services/http/response.js';
import { canChangeTaskStage, canManageTasks } from '../../services/kanban/permissions.js';
import { changeTaskStage, createTaskForProject, editTaskDetails } from '../../services/kanban/tasks.js';

export async function renderKanbanTask(req, res, next) {
	try {
		const task = await findTaskForMember(req.params.taskId, req.user.id);
		if (!task) return res.sendStatus(404);
		return res.render('kanban/task', {
			titleKey: 'kanban:taskDetails',
			styles: ['modals/main', 'kanban/main'],
			scripts: ['kanban/dueDates'],
			task,
			canEditTask: canManageTasks(task.viewer_role),
			canChangeStage: canChangeTaskStage(task.viewer_role, req.user.id, task.assignee_user_id),
			taskStages: Object.values(KANBAN_TASK_STAGES),
			taskLimits: KANBAN_TASK_LIMITS,
		});
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
