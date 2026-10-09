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
	renderProjects,
} from '../controllers/kanban/projects.js';
import {
	validateArchiveProject,
	validateAcceptInvitation,
	validateCreateProject,
	validateDeclineInvitation,
	validateInviteMember,
	validateProjectId,
} from '../middlewares/validators/kanban.js';

const router = Router();

router.get('/', renderProjects);
router.post('/', validateCreateProject, createKanbanProject);
router.post('/archive', validateArchiveProject, archiveKanbanProject);
router.post('/invitations', validateInviteMember, inviteProjectMember);
router.post('/invitations/accept', validateAcceptInvitation, acceptProjectInvitation);
router.post('/invitations/decline', validateDeclineInvitation, declineProjectInvitation);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
