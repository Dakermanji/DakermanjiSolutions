//! routes/chat.js

import { Router } from 'express';
import {
	closeFriendConversation,
	cancelPrivateRoomAccessRequest,
	createChatRoom,
	createFriendChatMessage,
	getFriendChats,
	getOlderFriendMessages,
	getPrivateRooms,
	getPublicRooms,
	joinPublicRoomConversation,
	openFriendConversation,
	openRoomConversation,
	renderChat,
	requestPrivateRoomAccess,
	searchVisibleRooms,
} from '../controllers/chat/index.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);
router.get('/friends/messages', getOlderFriendMessages);
router.get('/rooms/public', getPublicRooms);
router.get('/rooms/private', getPrivateRooms);
router.get('/rooms/search', searchVisibleRooms);
router.post('/friends/open', openFriendConversation);
router.post('/friends/close', closeFriendConversation);
router.post('/friends/messages', createFriendChatMessage);
router.post('/rooms', createChatRoom);
router.post('/rooms/join', joinPublicRoomConversation);
router.post('/rooms/open', openRoomConversation);
router.post('/rooms/request', requestPrivateRoomAccess);
router.post('/rooms/request/cancel', cancelPrivateRoomAccessRequest);

export default router;
