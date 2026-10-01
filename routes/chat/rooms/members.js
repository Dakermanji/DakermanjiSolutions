//! routes/chat/rooms/members.js

import { Router } from 'express';
import {
	banChatRoomMember,
	deleteChatRoomMemberHistory,
	demoteChatRoomAdmin,
	muteChatRoomMember,
	promoteChatRoomMember,
	removeChatRoomMember,
	unbanChatRoomMember,
	unmuteChatRoomMember,
} from '../../../controllers/chat/index.js';

const router = Router();

router.post('/promote', promoteChatRoomMember);
router.post('/demote', demoteChatRoomAdmin);
router.post('/remove', removeChatRoomMember);
router.post('/mute', muteChatRoomMember);
router.post('/unmute', unmuteChatRoomMember);
router.post('/ban', banChatRoomMember);
router.post('/unban', unbanChatRoomMember);
router.post('/delete-history', deleteChatRoomMemberHistory);

export default router;
