//! controllers/kanban/tasks.js

import {
	KANBAN_IMPORTANCE_EMOJIS,
	KANBAN_TASK_LIMITS,
	KANBAN_TASK_MESSAGE_LIMITS,
	KANBAN_TASK_STAGES,
} from '../../constants/kanban.js';
import { findProjectForUser, listProjectMembers } from '../../models/kanban/Projects.js';
import { listArchivedTasksForProject } from '../../models/kanban/Tasks.js';
import { fail } from '../../services/http/response.js';
import { canBeAssigned, canChangeTaskStage, canManageTasks } from '../../services/kanban/permissions.js';
import { changeTaskAssignee } from '../../services/kanban/taskAssignments.js';
import { createTaskForProject } from '../../services/kanban/taskCreation.js';
import { listTaskEventsForMember } from '../../services/kanban/taskEvents.js';
import { listTaskMessagesForMember } from '../../services/kanban/taskMessages.js';
import { reorderTaskWithinStage } from '../../services/kanban/taskOrdering.js';
import {
	archiveTaskWithLog,
	changeTaskStage,
	editTaskDetails,
	restoreTaskWithLog,
} from '../../services/kanban/tasks.js';

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

export async function renderArchivedKanbanTasks(req, res, next) {
	try {
		const project = await findProjectForUser(req.params.projectId, req.user.id);
		if (!project || !canManageTasks(project.role)) return res.sendStatus(404);
		const tasks = await listArchivedTasksForProject(project.id);
		return res.render('kanban/archivedTasks', {
			titleKey: 'kanban:archivedTasks',
			styles: ['kanban/main'],
			project,
			tasks,
		});
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

export async function renderKanbanTask(req, res, next) {
	try {
		const discussion = await listTaskMessagesForMember({
			taskId: req.params.taskId,
			viewerUserId: req.user.id,
		});
		if (!discussion) return res.sendStatus(404);
		const { task, messages } = discussion;
		const canEditTask = canManageTasks(task.viewer_role);
		const members = canEditTask
			? await listProjectMembers(task.project_id, req.user.id)
			: [];
		return res.render('kanban/task', {
			titleKey: 'kanban:taskDetails',
			styles: ['modals/main', 'kanban/main'],
			scripts: ['kanban/dueDates', 'kanban/taskChanges', 'kanban/archiveTask'],
			task,
			messages,
			taskMessageLimits: KANBAN_TASK_MESSAGE_LIMITS,
			canEditTask,
			canChangeStage: canChangeTaskStage(task.viewer_role, req.user.id, task.assignee_user_id),
			assignableMembers: members.filter((member) => canBeAssigned(member.role)),
			taskStages: Object.values(KANBAN_TASK_STAGES),
			importanceEmojis: KANBAN_IMPORTANCE_EMOJIS,
			taskLimits: KANBAN_TASK_LIMITS,
		});
	} catch (error) {
		return next(error);
	}
}

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
			...result,
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
