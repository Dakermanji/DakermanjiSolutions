//! routes/chat/rooms.js

import { Router } from 'express';
import {
	createChatRoom,
	getPrivateRooms,
	getPublicRooms,
	getRoomActivityLogs,
	joinPublicRoomConversation,
	leaveChatRoom,
	openRoomConversation,
	searchVisibleRooms,
	updateChatRoom,
} from '../../controllers/chat/index.js';
import invitationRoutes from './rooms/invitations.js';
import memberRoutes from './rooms/members.js';
import messageRoutes from './rooms/messages.js';
import moderationRoutes from './rooms/moderation.js';
import requestRoutes from './rooms/requests.js';

const router = Router();

router.get('/public', getPublicRooms);
router.get('/private', getPrivateRooms);
router.get('/search', searchVisibleRooms);
router.get('/activity', getRoomActivityLogs);
router.get('/open/:conversationId', openRoomConversation);

router.post('/', createChatRoom);
router.post('/update', updateChatRoom);
router.post('/join', joinPublicRoomConversation);
router.post('/leave', leaveChatRoom);
router.post('/open', openRoomConversation);

router.use('/messages', messageRoutes);
router.use('/flags', moderationRoutes);
router.use('/members', memberRoutes);
router.use('/request', requestRoutes);
router.use('/invitations', invitationRoutes);

export default router;
