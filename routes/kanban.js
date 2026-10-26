//! routes/kanban.js

import { Router } from 'express';
import {
	acceptProjectInvitation,
	declineProjectInvitation,
	inviteProjectMember,
} from '../controllers/kanban/members.js';
import {
	archiveKanbanProject,
	createKanbanProject,
	renderProject,
	renderProjectActivity,
	renderProjectMembers,
	renderProjects,
} from '../controllers/kanban/projects.js';
import {
	changeKanbanTaskStage,
	createKanbanTask,
	editKanbanTask,
	renderKanbanTask,
	renderKanbanTaskActivity,
} from '../controllers/kanban/tasks.js';
import {
	validateArchiveProject,
	validateAcceptInvitation,
	validateChangeTaskStage,
	validateCreateProject,
	validateCreateTask,
	validateDeclineInvitation,
	validateEditTask,
	validateInviteMember,
	validateProjectId,
	validateTaskId,
} from '../middlewares/validators/kanban.js';

const router = Router();

router.get('/', renderProjects);
router.post('/', validateCreateProject, createKanbanProject);
router.post('/archive', validateArchiveProject, archiveKanbanProject);
router.post('/tasks', validateCreateTask, createKanbanTask);
router.post('/tasks/edit', validateEditTask, editKanbanTask);
router.post('/tasks/stage', validateChangeTaskStage, changeKanbanTaskStage);
router.get('/tasks/:taskId', validateTaskId, renderKanbanTask);
router.get('/tasks/:taskId/activity', validateTaskId, renderKanbanTaskActivity);
router.post('/invitations', validateInviteMember, inviteProjectMember);
router.post('/invitations/accept', validateAcceptInvitation, acceptProjectInvitation);
router.post('/invitations/decline', validateDeclineInvitation, declineProjectInvitation);
router.get('/:projectId/activity', validateProjectId, renderProjectActivity);
router.get('/:projectId/members', validateProjectId, renderProjectMembers);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
