//! routes/notifications.js

import { Router } from 'express';
import { renderNotifications } from '../controllers/notifications/main.js';

const router = Router();

router.get('/', renderNotifications);

export default router;
