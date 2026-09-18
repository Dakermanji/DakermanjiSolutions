//! routes/home.js

import { Router } from 'express';
import { renderHome, sendContactMessage } from '../controllers/home.js';
import { contactLimiter } from '../middlewares/rateLimit.js';

const router = Router();

/**
 * Home Routes
 *
 * Handles routes related to the homepage.
 */

/**
 * GET /
 * Render the homepage.
 */
router.get('/', renderHome);
router.post('/contact', contactLimiter, sendContactMessage);

export default router;
