//! config/routes.js

/**
 * Application Routes
 *
 * Central route registry for the application.
 * Each feature owns its own route module, then gets mounted here.
 */

import { Router } from 'express';
import homeRoutes from '../routes/home.js';
import langRoutes from '../routes/lang.js';
import authRoutes from '../routes/auth.js';
import chatRoutes from '../routes/chat.js';
import notificationsRoutes from '../routes/notifications.js';
import socialRoutes from '../routes/social.js';
import profileRoutes from '../routes/profile.js';
import themeRoutes from '../routes/theme.js';
import avatarRoutes from '../routes/avatar.js';
import weatherRoutes from '../routes/weather.js';

const router = Router();

// Homepage routes
router.use('/', homeRoutes);

// Language switcher routes
router.use('/language', langRoutes);

// Auth routes
router.use('/auth', authRoutes);

// Chat routes
router.use('/chat', chatRoutes);

// Notification routes
router.use('/notifications', notificationsRoutes);

// Social routes
router.use('/social', socialRoutes);

// Profile routes
router.use('/profile', profileRoutes);

// Theme preference routes
router.use('/theme', themeRoutes);

// Avatar option routes
router.use('/avatar', avatarRoutes);

// Weather routes
router.use('/weather', weatherRoutes);

export default router;
