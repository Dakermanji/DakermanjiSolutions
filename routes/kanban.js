//! routes/kanban.js

import { Router } from 'express';
import {
	archiveKanbanProject,
	createKanbanProject,
	renderProject,
	renderProjects,
} from '../controllers/kanban/projects.js';
import {
	validateArchiveProject,
	validateCreateProject,
	validateProjectId,
} from '../middlewares/validators/kanban.js';

const router = Router();

router.get('/', renderProjects);
router.post('/', validateCreateProject, createKanbanProject);
router.post('/archive', validateArchiveProject, archiveKanbanProject);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
