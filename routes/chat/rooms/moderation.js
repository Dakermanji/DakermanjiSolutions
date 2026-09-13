//! routes/chat/rooms/moderation.js

import { Router } from 'express';
import {
	approvePendingRoomChatMessage,
	deleteFlaggedRoomMessage,
	getRoomMessageFlags,
	hidePendingRoomChatMessage,
	markRoomMessageSafe,
} from '../../../controllers/chat/index.js';

const router = Router();

router.get('/', getRoomMessageFlags);
router.post('/safe', markRoomMessageSafe);
router.post('/delete', deleteFlaggedRoomMessage);
router.post('/approve-pending', approvePendingRoomChatMessage);
router.post('/hide-pending', hidePendingRoomChatMessage);

export default router;
