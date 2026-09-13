//! routes/chat/rooms/invitations.js

import { Router } from 'express';
import { inviteChatRoomMember } from '../../../controllers/chat/index.js';

const router = Router();

router.post('/', inviteChatRoomMember);

export default router;
