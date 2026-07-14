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
router.get('/messages', getOlderFriendMessages);
router.post('/open', openFriendConversation);
router.post('/close', closeFriendConversation);
router.post('/messages', createFriendChatMessage);

export default router;
