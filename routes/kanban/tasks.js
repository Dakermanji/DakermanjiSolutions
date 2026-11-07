//! routes/kanban/tasks.js

import { Router } from 'express';
import {
	archiveKanbanTask,
	changeKanbanTaskAssignee,
	changeKanbanTaskStage,
	createKanbanTask,
	editKanbanTask,
	renderKanbanTask,
	renderKanbanTaskActivity,
	renderKanbanTaskActivityEvents,
	renderKanbanTaskCard,
	renderKanbanTaskDetails,
	renderKanbanTaskDiscussion,
	reorderKanbanTask,
	restoreKanbanTask,
} from '../../controllers/kanban/tasks.js';
import {
	createKanbanTaskMessage,
	editKanbanTaskMessage,
} from '../../controllers/kanban/taskMessages.js';
import {
	validateArchiveTask,
	validateChangeTaskAssignee,
	validateChangeTaskStage,
	validateCreateTask,
	validateCreateTaskMessage,
	validateEditTask,
	validateEditTaskMessage,
	validateReorderTask,
	validateRestoreTask,
	validateTaskId,
} from '../../middlewares/validators/kanban.js';

const router = Router();

router.post('/', validateCreateTask, createKanbanTask);
router.post('/messages', validateCreateTaskMessage, createKanbanTaskMessage);
router.post('/messages/edit', validateEditTaskMessage, editKanbanTaskMessage);
router.post('/archive', validateArchiveTask, archiveKanbanTask);
router.post('/restore', validateRestoreTask, restoreKanbanTask);
router.post('/edit', validateEditTask, editKanbanTask);
router.post('/assign', validateChangeTaskAssignee, changeKanbanTaskAssignee);
router.post('/stage', validateChangeTaskStage, changeKanbanTaskStage);
router.post('/reorder', validateReorderTask, reorderKanbanTask);
router.get('/:taskId/card', validateTaskId, renderKanbanTaskCard);
router.get('/:taskId/details', validateTaskId, renderKanbanTaskDetails);
router.get('/:taskId/discussion', validateTaskId, renderKanbanTaskDiscussion);
router.get('/:taskId/activity/events', validateTaskId, renderKanbanTaskActivityEvents);
router.get('/:taskId/activity', validateTaskId, renderKanbanTaskActivity);
router.get('/:taskId', validateTaskId, renderKanbanTask);

export default router;
