//! routes/chat.js

import { Router } from 'express';
import {
	closeFriendConversation,
	createChatRoom,
	createFriendChatMessage,
	getFriendChats,
	getOlderFriendMessages,
	getPrivateRooms,
	getPublicRooms,
	openFriendConversation,
	renderChat,
} from '../controllers/chat/index.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);
router.get('/friends/messages', getOlderFriendMessages);
router.get('/rooms/public', getPublicRooms);
router.get('/rooms/private', getPrivateRooms);
router.post('/friends/open', openFriendConversation);
router.post('/friends/close', closeFriendConversation);
router.post('/friends/messages', createFriendChatMessage);
router.post('/rooms', createChatRoom);

export default router;
