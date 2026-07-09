//! routes/chat.js

import { Router } from 'express';
import { getFriendChats, renderChat } from '../controllers/chat.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);

export default router;
