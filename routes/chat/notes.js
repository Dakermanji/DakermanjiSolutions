//! routes/chat/notes.js

import { Router } from 'express';
import {
	createNotesChatMessage,
	deleteNotesMessage,
	editNotesMessage,
	getNotesMessageReactionUsers,
	getOlderNotesMessages,
	reactToNotesMessage,
	renderNotesConversation,
	resetNotesConversation,
} from '../../controllers/chat/index.js';
import { messageWriteLimiter } from '../../middlewares/rateLimit.js';
import ChatConversationsModel from '../../models/chat/Conversations.js';

const router = Router();

router.get('/', renderNotesConversation);
router.use(async (req, res, next) => {
	try {
		const conversation = await ChatConversationsModel.findSelfConversationForUser(
			req.user.id,
		);
		req.chatNotesConversationId = conversation?.conversation_id || null;
		next();
	} catch (error) {
		next(error);
	}
});

router.get('/messages', getOlderNotesMessages);
router.get('/messages/reactions', getNotesMessageReactionUsers);
router.post('/reset', resetNotesConversation);
router.post('/messages', messageWriteLimiter, createNotesChatMessage);
router.post('/messages/edit', editNotesMessage);
router.post('/messages/delete', deleteNotesMessage);
router.post('/messages/react', reactToNotesMessage);

export default router;
