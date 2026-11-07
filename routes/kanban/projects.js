//! routes/kanban/projects.js

import { Router } from 'express';
import {
	renderProject,
	renderProjectActivity,
	renderProjectActivityEvents,
	renderProjectMembers,
} from '../../controllers/kanban/projects.js';
import {
	renderArchivedKanbanTasks,
	renderKanbanTaskStageOrder,
} from '../../controllers/kanban/tasks.js';
import { validateProjectId } from '../../middlewares/validators/kanban.js';

const router = Router();

router.get('/:projectId/task-order/:stage', validateProjectId, renderKanbanTaskStageOrder);
router.get('/:projectId/activity/events', validateProjectId, renderProjectActivityEvents);
router.get('/:projectId/activity', validateProjectId, renderProjectActivity);
router.get('/:projectId/members', validateProjectId, renderProjectMembers);
router.get('/:projectId/archived-tasks', validateProjectId, renderArchivedKanbanTasks);
router.get('/:projectId', validateProjectId, renderProject);

export default router;
