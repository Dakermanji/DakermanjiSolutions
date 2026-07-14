//! routes/chat.js

import { Router } from 'express';
import {
	closeChatConversation,
	createChatMessage,
	getFriendChats,
	getOlderChatMessages,
	openChatConversation,
	renderChat,
} from '../controllers/chat.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);
router.get('/messages', getOlderChatMessages);
router.post('/open', openChatConversation);
router.post('/close', closeChatConversation);
router.post('/messages', createChatMessage);

export default router;
