//! routes/chat.js

import { Router } from 'express';
import {
	closeChatConversation,
	getFriendChats,
	openChatConversation,
	renderChat,
} from '../controllers/chat.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);
router.post('/open', openChatConversation);
router.post('/close', closeChatConversation);

export default router;
