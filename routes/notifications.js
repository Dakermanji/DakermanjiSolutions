//! routes/notifications.js

import { Router } from 'express';
import {
	approveChatRoomJoinRequest,
	dismissAppNotification,
	rejectChatRoomJoinRequest,
	renderNotifications,
} from '../controllers/notifications/main.js';

const router = Router();

router.get('/', renderNotifications);
router.post('/dismiss', dismissAppNotification);
router.post('/chat/room-join-request/approve', approveChatRoomJoinRequest);
router.post('/chat/room-join-request/reject', rejectChatRoomJoinRequest);

export default router;
