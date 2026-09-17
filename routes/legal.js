//! routes/legal.js

import { Router } from 'express';
import { renderPrivacyPolicy } from '../controllers/legal.js';

const router = Router();

router.get('/privacy', renderPrivacyPolicy);

export default router;

