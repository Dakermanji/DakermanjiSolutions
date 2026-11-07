//! routes/kanban/invitations.js

import { Router } from 'express';
import {
	acceptProjectInvitation,
	declineProjectInvitation,
	inviteProjectMember,
} from '../../controllers/kanban/members.js';
import {
	validateAcceptInvitation,
	validateDeclineInvitation,
	validateInviteMember,
} from '../../middlewares/validators/kanban.js';

const router = Router();

router.post('/', validateInviteMember, inviteProjectMember);
router.post('/accept', validateAcceptInvitation, acceptProjectInvitation);
router.post('/decline', validateDeclineInvitation, declineProjectInvitation);

export default router;
