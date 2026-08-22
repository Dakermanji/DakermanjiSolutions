//! routes/notifications.js

import { Router } from 'express';
import {
	acceptChatRoomInvitation,
	approveChatRoomJoinRequest,
	dismissAppNotification,
	rejectChatRoomInvitation,
	rejectChatRoomJoinRequest,
	renderNotifications,
} from '../controllers/notifications/main.js';

const router = Router();

router.get('/', renderNotifications);
router.post('/dismiss', dismissAppNotification);
router.post('/chat/room-join-request/approve', approveChatRoomJoinRequest);
router.post('/chat/room-join-request/reject', rejectChatRoomJoinRequest);
router.post('/chat/room-invitation/accept', acceptChatRoomInvitation);
router.post('/chat/room-invitation/reject', rejectChatRoomInvitation);

export default router;
