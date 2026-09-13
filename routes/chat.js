//! routes/chat.js

import { Router } from 'express';
import { openChatMessage, renderChat } from '../controllers/chat/index.js';
import friendRoutes from './chat/friends.js';
import notesRoutes from './chat/notes.js';
import roomRoutes from './chat/rooms.js';

const router = Router();

router.get('/', renderChat);
router.get('/messages/open/:conversationId/:messageId', openChatMessage);
router.use('/friends', friendRoutes);
router.use('/notes', notesRoutes);
router.use('/rooms', roomRoutes);

export default router;
