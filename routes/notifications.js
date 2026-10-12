//! routes/notifications.js

import { Router } from 'express';
import {
	acceptChatRoomInvitation,
	approveChatRoomJoinRequest,
	rejectChatRoomInvitation,
	rejectChatRoomJoinRequest,
} from '../controllers/notifications/chat.js';
import {
	dismissAppNotification,
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
