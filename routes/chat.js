//! routes/chat.js

import { Router } from 'express';
import {
	closeFriendConversation,
	createFriendChatMessage,
	getFriendChats,
	getOlderFriendMessages,
	openFriendConversation,
	renderChat,
} from '../controllers/chat/index.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);
router.get('/friends/messages', getOlderFriendMessages);
router.post('/friends/open', openFriendConversation);
router.post('/friends/close', closeFriendConversation);
router.post('/friends/messages', createFriendChatMessage);

export default router;
