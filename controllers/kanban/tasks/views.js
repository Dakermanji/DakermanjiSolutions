//! controllers/kanban/tasks/views.js

import {
	KANBAN_IMPORTANCE_EMOJIS,
	KANBAN_TASK_LIMITS,
	KANBAN_TASK_MESSAGE_LIMITS,
	KANBAN_TASK_STAGES,
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
} from '../../../services/kanban/permissions.js';
import { listTaskEventsForMember } from '../../../services/kanban/taskEvents.js';
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
			canChangeStage: canChangeTaskStage(task.viewer_role, req.user.id, task.assignee_user_id),
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
			stages: KANBAN_TASK_STAGES,
			importanceEmojis: KANBAN_IMPORTANCE_EMOJIS,
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
