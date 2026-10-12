//! controllers/kanban/projects.js

import {
	KANBAN_INVITATION_LIMITS,
	KANBAN_PROJECT_LIMITS,
} from '../../constants/kanban.js';
import {
	listDeclinedInvitationsForUser,
	listInvitationsForUser,
	listProjectInvitationRequests,
} from '../../models/kanban/Members.js';
import {
	findProjectForUser,
	listProjectMembers,
	listProjectsForUser,
} from '../../models/kanban/Projects.js';
import { listProjectEventsForMember } from '../../services/kanban/projectEvents.js';
import { archiveProjectWithLog, createProjectWithLog } from '../../services/kanban/projects.js';

export async function renderProjects(req, res, next) {
	try {
		const [projects, invitations, declinedInvitations] = await Promise.all([
			listProjectsForUser(req.user.id),
			listInvitationsForUser(req.user.id),
			listDeclinedInvitationsForUser(req.user.id),
		]);
		return res.render('kanban/projects', {
			titleKey: 'kanban:title',
			styles: ['modals/main', 'kanban/main'],
			scripts: ['kanban/archiveProject'],
			projects,
			invitations,
			declinedInvitations,
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

export async function renderProject(req, res, next) {
	try {
		const project = await findProjectForUser(req.params.projectId, req.user.id);
		if (!project) return res.sendStatus(404);
		return res.render('kanban/project', {
			titleKey: 'kanban:title',
			styles: ['modals/main', 'kanban/main'],
			scripts: ['kanban/archiveProject'],
			project,
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
			project,
			events,
		});
	} catch (error) {
		return next(error);
	}
}
