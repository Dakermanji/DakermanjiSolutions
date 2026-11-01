//! routes/kanban.js

import { Router } from 'express';
import {
	acceptProjectInvitation,
	changeProjectMemberRole,
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
	archiveKanbanTask,
	changeKanbanTaskAssignee,
	changeKanbanTaskStage,
	createKanbanTask,
	editKanbanTask,
	renderKanbanTask,
	renderKanbanTaskActivity,
	renderArchivedKanbanTasks,
	restoreKanbanTask,
} from '../controllers/kanban/tasks.js';
import {
	createKanbanTaskMessage,
	editKanbanTaskMessage,
} from '../controllers/kanban/taskMessages.js';
import {
	validateArchiveProject,
	validateAcceptInvitation,
	validateChangeTaskAssignee,
	validateChangeMemberRole,
	validateChangeTaskStage,
	validateArchiveTask,
	validateRestoreTask,
	validateCreateProject,
	validateCreateTask,
	validateCreateTaskMessage,
	validateEditTaskMessage,
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
router.post('/tasks/messages', validateCreateTaskMessage, createKanbanTaskMessage);
router.post('/tasks/messages/edit', validateEditTaskMessage, editKanbanTaskMessage);
router.post('/tasks/archive', validateArchiveTask, archiveKanbanTask);
router.post('/tasks/restore', validateRestoreTask, restoreKanbanTask);
router.post('/tasks/edit', validateEditTask, editKanbanTask);
router.post('/tasks/assign', validateChangeTaskAssignee, changeKanbanTaskAssignee);
router.post('/tasks/stage', validateChangeTaskStage, changeKanbanTaskStage);
router.get('/tasks/:taskId', validateTaskId, renderKanbanTask);
router.get('/tasks/:taskId/activity', validateTaskId, renderKanbanTaskActivity);
router.post('/invitations', validateInviteMember, inviteProjectMember);
router.post('/members/role', validateChangeMemberRole, changeProjectMemberRole);
router.post('/invitations/accept', validateAcceptInvitation, acceptProjectInvitation);
router.post('/invitations/decline', validateDeclineInvitation, declineProjectInvitation);
router.get('/:projectId/activity', validateProjectId, renderProjectActivity);
router.get('/:projectId/members', validateProjectId, renderProjectMembers);
router.get('/:projectId/archived-tasks', validateProjectId, renderArchivedKanbanTasks);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
