//! routes/chat.js

import { Router } from 'express';
import { renderChat } from '../controllers/chat.js';

const router = Router();

router.get('/', renderChat);

export default router;
