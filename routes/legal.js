//! routes/legal.js

import { Router } from 'express';
import {
	renderPrivacyPolicy,
	renderTermsOfService,
} from '../controllers/legal.js';

const router = Router();

router.get('/privacy', renderPrivacyPolicy);
router.get('/terms', renderTermsOfService);

export default router;
