//! controllers/kanban/projects.js

import {
	KANBAN_IMPORTANCE_EMOJIS,
	KANBAN_INVITATION_LIMITS,
	KANBAN_PROJECT_LIMITS,
	KANBAN_TASK_LIMITS,
} from '../../constants/kanban.js';
import {
	listDeclinedInvitationsForUser,
	listInvitationsForUser,
	listProjectInvitationRequests,
} from '../../models/kanban/Members.js';
import {
	findProjectForUser,
	listArchivedProjectsForOwner,
	listProjectMembers,
	listProjectsForUser,
} from '../../models/kanban/Projects.js';
import { listTasksForProject } from '../../models/kanban/Tasks.js';
import { listProjectEventsForMember } from '../../services/kanban/projectEvents.js';
import {
	canBeAssigned,
	canChangeTaskStage,
	canManageTasks,
	canReorderTask,
} from '../../services/kanban/permissions.js';
import {
	archiveProjectWithLog,
	createProjectWithLog,
	restoreProjectWithLog,
} from '../../services/kanban/projects.js';

export async function renderProjects(req, res, next) {
	try {
		const [projects, invitations, declinedInvitations, archivedProjects] = await Promise.all([
			listProjectsForUser(req.user.id),
			listInvitationsForUser(req.user.id),
			listDeclinedInvitationsForUser(req.user.id),
			listArchivedProjectsForOwner(req.user.id),
		]);
		return res.render('kanban/projects', {
			titleKey: 'kanban:title',
			styles: ['modals/main', 'kanban/main'],
			scripts: ['kanban/archiveProject'],
			projects,
			invitations,
			declinedInvitations,
			archivedProjects,
			projectLimits: KANBAN_PROJECT_LIMITS,
		});
	} catch (error) {
		return next(error);
	}
}

export async function createKanbanProject(req, res, next) {
	try {
		const project = await createProjectWithLog(req.kanbanProjectInput);
		req.flash('success', 'kanban:projectCreated');
		return res.redirect(`/kanban/${project.id}`);
	} catch (error) {
		return next(error);
	}
}

export async function archiveKanbanProject(req, res, next) {
	try {
		const archived = await archiveProjectWithLog(req.kanbanArchiveInput);
		req.flash(
			archived ? 'success' : 'error',
			archived ? 'kanban:projectArchived' : 'kanban:error.archiveFailed',
		);
		return res.redirect('/kanban');
	} catch (error) {
		return next(error);
	}
}

export async function restoreKanbanProject(req, res, next) {
	try {
		const restored = await restoreProjectWithLog(req.kanbanRestoreProjectInput);
		req.flash(
			restored ? 'success' : 'error',
			restored ? 'kanban:projectRestored' : 'kanban:error.restoreFailed',
		);
		return res.redirect('/kanban');
	} catch (error) {
		return next(error);
	}
}

export async function renderProject(req, res, next) {
	try {
		const project = await findProjectForUser(req.params.projectId, req.user.id);
		if (!project) return res.sendStatus(404);
		const canCreateTask = canManageTasks(project.role);
		const [projectTasks, members] = await Promise.all([
			listTasksForProject(project.id, req.user.id),
			canCreateTask ? listProjectMembers(project.id, req.user.id) : [],
		]);
		const tasks = projectTasks.map((task) => ({
			...task,
			canChangeStage: canChangeTaskStage(
				project.role,
				req.user.id,
				task.assignee_user_id,
				task.is_overdue,
			),
			canReorder: canReorderTask(
				project.role,
				req.user.id,
				task.assignee_user_id,
			),
		}));
		return res.render('kanban/project', {
			titleKey: 'kanban:title',
			styles: ['modals/main', 'kanban/main'],
			scripts: [
				'kanban/archiveProject',
				'kanban/dueDates',
				'kanban/live',
				'kanban/taskDragDrop',
			],
			project,
			tasks,
			canCreateTask,
			assignableMembers: members.filter((member) => canBeAssigned(member.role)),
			importanceEmojis: KANBAN_IMPORTANCE_EMOJIS,
			taskLimits: KANBAN_TASK_LIMITS,
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderProjectMembers(req, res, next) {
	try {
		const project = await findProjectForUser(req.params.projectId, req.user.id);
		if (!project) return res.sendStatus(404);
		const [members, invitations] = await Promise.all([
			listProjectMembers(project.id, req.user.id),
			project.role === 'owner'
				? listProjectInvitationRequests(project.id, req.user.id)
				: [],
		]);
		return res.render('kanban/members', {
			titleKey: 'kanban:members',
			styles: ['modals/main', 'kanban/main'],
			scripts: project.role === 'owner'
				? ['kanban/memberRoleModal', 'kanban/ownershipTransferModal']
				: [],
			project,
			members,
			invitations,
			invitationLimits: KANBAN_INVITATION_LIMITS,
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderProjectActivity(req, res, next) {
	try {
		const project = await findProjectForUser(req.params.projectId, req.user.id);
		if (!project) return res.sendStatus(404);
		const events = await listProjectEventsForMember({
			projectId: project.id,
			userId: req.user.id,
		});
		if (events === null) return res.sendStatus(404);
		return res.render('kanban/activity', {
			titleKey: 'kanban:projectActivity',
			styles: ['kanban/main'],
			scripts: ['kanban/projectActivityLive'],
			project,
			events,
		});
	} catch (error) {
		return next(error);
	}
}

export async function renderProjectActivityEvents(req, res, next) {
	try {
		const events = await listProjectEventsForMember({
			projectId: req.params.projectId,
			userId: req.user.id,
		});
		if (events === null) return res.sendStatus(404);
		return res.render('kanban/_project_activity_events', {
			layout: false,
			events,
		});
	} catch (error) {
		return next(error);
	}
}
