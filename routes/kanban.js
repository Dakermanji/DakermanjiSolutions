//! routes/kanban.js

import { Router } from 'express';
import {
	createKanbanProject,
	renderProject,
	renderProjects,
} from '../controllers/kanban/projects.js';
import {
	validateCreateProject,
	validateProjectId,
} from '../middlewares/validators/kanban.js';

const router = Router();

router.get('/', renderProjects);
router.post('/', validateCreateProject, createKanbanProject);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
