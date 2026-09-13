//! routes/chat/rooms/requests.js

import { Router } from 'express';
import {
	cancelPrivateRoomAccessRequest,
	requestPrivateRoomAccess,
} from '../../../controllers/chat/index.js';

const router = Router();

router.post('/', requestPrivateRoomAccess);
router.post('/cancel', cancelPrivateRoomAccessRequest);

export default router;
