//! routes/chat/rooms/messages.js

import { Router } from 'express';
import {
	createRoomChatMessage,
	deleteRoomChatMessage,
	editRoomChatMessage,
	flagRoomChatMessage,
	getOlderRoomMessages,
	getRoomChatMessageReactionUsers,
	openRoomChatMessage,
	reactToRoomChatMessage,
} from '../../../controllers/chat/index.js';
import { messageWriteLimiter } from '../../../middlewares/rateLimit.js';

const router = Router();

router.get('/', getOlderRoomMessages);
router.get('/reactions', getRoomChatMessageReactionUsers);
router.post('/', messageWriteLimiter, createRoomChatMessage);
router.post('/edit', editRoomChatMessage);
router.post('/delete', deleteRoomChatMessage);
router.post('/flag', flagRoomChatMessage);
router.post('/open', openRoomChatMessage);
router.post('/react', reactToRoomChatMessage);

export default router;
