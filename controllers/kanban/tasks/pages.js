//! controllers/kanban/tasks/pages.js

import {
	KANBAN_TASK_STAGES,
	KANBAN_IMPORTANCE_EMOJIS,
	KANBAN_TASK_LIMITS,
	KANBAN_TASK_MESSAGE_LIMITS,
} from '../../../constants/kanban.js';
import { findProjectForUser, listProjectMembers } from '../../../models/kanban/Projects.js';
import {
	findTaskForMember,
	listArchivedTasksForProject,
	listTasksForProject,
} from '../../../models/kanban/Tasks.js';
import {
	canAssignTaskToRole,
	canChangeTaskAssignee,
	canChangeTaskStage,
	canManageTasks,
	canReorderTask,
} from '../../../services/kanban/permissions.js';
import { listTaskMessagesForMember } from '../../../services/kanban/taskMessages.js';

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

export async function renderKanbanTask(req, res, next) {
	try {
		const discussion = await listTaskMessagesForMember({
			taskId: req.params.taskId,
			viewerUserId: req.user.id,
		});
		if (!discussion) return res.sendStatus(404);
		const { task, messages } = discussion;
		const canEditTask = canManageTasks(task.viewer_role);
		const canChangeAssignee = canChangeTaskAssignee(
			task.viewer_role,
			req.user.id,
			task.assignee_user_id,
		);
		const members = await listProjectMembers(task.project_id, req.user.id);
		return res.render('kanban/task', {
			titleKey: 'kanban:taskDetails',
			styles: ['modals/main', 'kanban/main'],
			scripts: ['kanban/dueDates', 'kanban/taskChanges', 'kanban/archiveTask', 'kanban/taskMentions', 'kanban/taskLive'],
			task,
			messages,
			taskMessageLimits: KANBAN_TASK_MESSAGE_LIMITS,
			canEditTask,
			canChangeAssignee,
			canChangeStage: canChangeTaskStage(
				task.viewer_role,
				req.user.id,
				task.assignee_user_id,
				task.is_overdue,
			),
			assignableMembers: canChangeAssignee
				? members.filter((member) => canAssignTaskToRole(
					task.viewer_role,
					req.user.id,
					task.assignee_user_id,
					member.role,
				))
				: [],
			mentionMembers: members.map(({ user_id, username }) => ({
				id: user_id,
				username,
			})),
			taskStages: Object.values(KANBAN_TASK_STAGES),
			importanceEmojis: KANBAN_IMPORTANCE_EMOJIS,
			taskLimits: KANBAN_TASK_LIMITS,
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderKanbanTaskCard(req, res, next) {
	try {
		const context = await findTaskForMember(req.params.taskId, req.user.id);
		if (!context) return res.sendStatus(404);

		const projectTasks = await listTasksForProject(context.project_id, req.user.id);
		const tasks = projectTasks.map((task) => ({
			...task,
			canChangeStage: canChangeTaskStage(
				context.viewer_role,
				req.user.id,
				task.assignee_user_id,
				task.is_overdue,
			),
			canReorder: canReorderTask(
				context.viewer_role,
				req.user.id,
				task.assignee_user_id,
			),
		}));
		const task = tasks.find((item) => item.id === context.id);
		if (!task) return res.sendStatus(404);

		const stageTasks = tasks.filter((item) => item.status === task.status);
		const taskIndex = stageTasks.findIndex((item) => item.id === task.id);
		return res.render('kanban/_task_card', {
			layout: false,
			task,
			taskIndex,
			stageTasks,
			stages: Object.values(KANBAN_TASK_STAGES),
			importanceEmojis: KANBAN_IMPORTANCE_EMOJIS,
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderKanbanTaskStageOrder(req, res, next) {
	try {
		const { projectId, stage } = req.params;
		if (!Object.values(KANBAN_TASK_STAGES).includes(stage)) return res.sendStatus(404);

		const project = await findProjectForUser(projectId, req.user.id);
		if (!project) return res.sendStatus(404);

		const tasks = await listTasksForProject(project.id, req.user.id);
		return res.json({
			orderedTaskIds: tasks
				.filter((task) => task.status === stage)
				.map((task) => task.id),
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderKanbanTaskDetails(req, res, next) {
	try {
		const task = await findTaskForMember(req.params.taskId, req.user.id);
		if (!task) return res.sendStatus(404);

		const members = await listProjectMembers(task.project_id, req.user.id);
		const canEditTask = canManageTasks(task.viewer_role);
		const canChangeAssignee = canChangeTaskAssignee(
			task.viewer_role,
			req.user.id,
			task.assignee_user_id,
		);
		return res.render('kanban/_task_details', {
			layout: false,
			task,
			canEditTask,
			canChangeAssignee,
			canChangeStage: canChangeTaskStage(
				task.viewer_role,
				req.user.id,
				task.assignee_user_id,
				task.is_overdue,
			),
			assignableMembers: canChangeAssignee
				? members.filter((member) => canAssignTaskToRole(
					task.viewer_role,
					req.user.id,
					task.assignee_user_id,
					member.role,
				))
				: [],
			taskStages: Object.values(KANBAN_TASK_STAGES),
			importanceEmojis: KANBAN_IMPORTANCE_EMOJIS,
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderKanbanTaskDiscussion(req, res, next) {
	try {
		const discussion = await listTaskMessagesForMember({
			taskId: req.params.taskId,
			viewerUserId: req.user.id,
		});
		if (!discussion) return res.sendStatus(404);
		return res.render('kanban/_task_discussion', {
			layout: false,
			...discussion,
			taskMessageLimits: KANBAN_TASK_MESSAGE_LIMITS,
		});
	} catch (error) {
		return next(error);
	}
}
