//! routes/kanban.js

import { Router } from 'express';
import {
	acceptProjectInvitation,
	changeProjectMemberRole,
	declineProjectInvitation,
	inviteProjectMember,
	leaveKanbanProjectController,
	removeProjectMember,
	transferProjectOwnershipController,
} from '../controllers/kanban/members.js';
import {
	archiveKanbanProject,
	createKanbanProject,
	renderProject,
	renderProjectActivity,
	renderProjectActivityEvents,
	renderProjectMembers,
	renderProjects,
	restoreKanbanProject,
} from '../controllers/kanban/projects.js';
import {
	archiveKanbanTask,
	changeKanbanTaskAssignee,
	changeKanbanTaskStage,
	createKanbanTask,
	editKanbanTask,
	renderKanbanTask,
	renderKanbanTaskCard,
	renderKanbanTaskStageOrder,
	renderKanbanTaskDetails,
	renderKanbanTaskDiscussion,
	renderKanbanTaskActivity,
	renderKanbanTaskActivityEvents,
	renderArchivedKanbanTasks,
	restoreKanbanTask,
	reorderKanbanTask,
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
	validateLeaveProject,
	validateRemoveProjectMember,
	validateTransferProjectOwnership,
	validateChangeTaskStage,
	validateReorderTask,
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
	validateRestoreProject,
	validateTaskId,
} from '../middlewares/validators/kanban.js';

const router = Router();

router.get('/', renderProjects);
router.post('/', validateCreateProject, createKanbanProject);
router.post('/archive', validateArchiveProject, archiveKanbanProject);
router.post('/restore', validateRestoreProject, restoreKanbanProject);
router.post('/tasks', validateCreateTask, createKanbanTask);
router.post('/tasks/messages', validateCreateTaskMessage, createKanbanTaskMessage);
router.post('/tasks/messages/edit', validateEditTaskMessage, editKanbanTaskMessage);
router.post('/tasks/archive', validateArchiveTask, archiveKanbanTask);
router.post('/tasks/restore', validateRestoreTask, restoreKanbanTask);
router.post('/tasks/edit', validateEditTask, editKanbanTask);
router.post('/tasks/assign', validateChangeTaskAssignee, changeKanbanTaskAssignee);
router.post('/tasks/stage', validateChangeTaskStage, changeKanbanTaskStage);
router.post('/tasks/reorder', validateReorderTask, reorderKanbanTask);
router.get('/tasks/:taskId/card', validateTaskId, renderKanbanTaskCard);
router.get('/:projectId/task-order/:stage', validateProjectId, renderKanbanTaskStageOrder);
router.get('/tasks/:taskId/details', validateTaskId, renderKanbanTaskDetails);
router.get('/tasks/:taskId/discussion', validateTaskId, renderKanbanTaskDiscussion);
router.get('/tasks/:taskId/activity/events', validateTaskId, renderKanbanTaskActivityEvents);
router.get('/tasks/:taskId', validateTaskId, renderKanbanTask);
router.get('/tasks/:taskId/activity', validateTaskId, renderKanbanTaskActivity);
router.post('/invitations', validateInviteMember, inviteProjectMember);
router.post('/members/role', validateChangeMemberRole, changeProjectMemberRole);
router.post('/members/remove', validateRemoveProjectMember, removeProjectMember);
router.post('/members/transfer-ownership', validateTransferProjectOwnership, transferProjectOwnershipController);
router.post('/members/leave', validateLeaveProject, leaveKanbanProjectController);
router.post('/invitations/accept', validateAcceptInvitation, acceptProjectInvitation);
router.post('/invitations/decline', validateDeclineInvitation, declineProjectInvitation);
router.get('/:projectId/activity', validateProjectId, renderProjectActivity);
router.get('/:projectId/activity/events', validateProjectId, renderProjectActivityEvents);
router.get('/:projectId/members', validateProjectId, renderProjectMembers);
router.get('/:projectId/archived-tasks', validateProjectId, renderArchivedKanbanTasks);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
