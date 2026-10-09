//! routes/kanban.js

import { Router } from 'express';
import { inviteProjectMember } from '../controllers/kanban/members.js';
import {
	archiveKanbanProject,
	createKanbanProject,
	renderProject,
	renderProjects,
} from '../controllers/kanban/projects.js';
import {
	validateArchiveProject,
	validateCreateProject,
	validateInviteMember,
	validateProjectId,
} from '../middlewares/validators/kanban.js';

const router = Router();

router.get('/', renderProjects);
router.post('/', validateCreateProject, createKanbanProject);
router.post('/archive', validateArchiveProject, archiveKanbanProject);
router.post('/invitations', validateInviteMember, inviteProjectMember);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
