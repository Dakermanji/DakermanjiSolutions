//! routes/kanban/members.js

import { Router } from 'express';
import {
	changeProjectMemberRole,
	leaveKanbanProjectController,
	removeProjectMember,
	transferProjectOwnershipController,
} from '../../controllers/kanban/members.js';
import {
	validateChangeMemberRole,
	validateLeaveProject,
	validateRemoveProjectMember,
	validateTransferProjectOwnership,
} from '../../middlewares/validators/kanban.js';

const router = Router();

router.post('/role', validateChangeMemberRole, changeProjectMemberRole);
router.post('/remove', validateRemoveProjectMember, removeProjectMember);
router.post('/transfer-ownership', validateTransferProjectOwnership, transferProjectOwnershipController);
router.post('/leave', validateLeaveProject, leaveKanbanProjectController);

export default router;
