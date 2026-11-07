//! routes/kanban.js

import { Router } from 'express';
import {
	archiveKanbanProject,
	createKanbanProject,
	renderProjects,
	restoreKanbanProject,
} from '../controllers/kanban/projects.js';
import {
	validateArchiveProject,
	validateCreateProject,
	validateRestoreProject,
} from '../middlewares/validators/kanban.js';
import invitationRoutes from './kanban/invitations.js';
import memberRoutes from './kanban/members.js';
import projectRoutes from './kanban/projects.js';
import taskRoutes from './kanban/tasks.js';

const router = Router();

router.get('/', renderProjects);
router.post('/', validateCreateProject, createKanbanProject);
router.post('/archive', validateArchiveProject, archiveKanbanProject);
router.post('/restore', validateRestoreProject, restoreKanbanProject);
router.use('/tasks', taskRoutes);
router.use('/invitations', invitationRoutes);
router.use('/members', memberRoutes);
router.use('/', projectRoutes);

export default router;
