//! routes/chat/friends.js

import { Router } from 'express';
import {
	closeFriendConversation,
	createFriendChatMessage,
	deleteFriendChatMessage,
	editFriendChatMessage,
	getFriendChats,
	getFriendChatMessageReactionUsers,
	getOlderFriendMessages,
	openFriendConversation,
	reactToFriendChatMessage,
} from '../../controllers/chat/index.js';
import { messageWriteLimiter } from '../../middlewares/rateLimit.js';

const router = Router();

router.get('/', getFriendChats);
router.get('/messages', getOlderFriendMessages);
router.get('/messages/reactions', getFriendChatMessageReactionUsers);
router.post('/open', openFriendConversation);
router.post('/close', closeFriendConversation);
router.post('/messages', messageWriteLimiter, createFriendChatMessage);
router.post('/messages/edit', editFriendChatMessage);
router.post('/messages/delete', deleteFriendChatMessage);
router.post('/messages/react', reactToFriendChatMessage);

export default router;
