//! routes/home.js

import { Router } from 'express';
import { sendContactMessage } from '../controllers/home.js';
import { contactLimiter } from '../middlewares/rateLimit.js';

const router = Router();

/**
 * Home Routes
 *
 * Handles contact form submissions from the homepage.
 */
router.post('/contact', contactLimiter, sendContactMessage);

export default router;
