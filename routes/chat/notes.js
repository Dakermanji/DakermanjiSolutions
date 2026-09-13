//! routes/chat/notes.js

import { Router } from 'express';
import {
	createNotesChatMessage,
	deleteNotesMessage,
	editNotesMessage,
	getNotesMessageReactionUsers,
	getOlderNotesMessages,
	openNotesConversation,
	reactToNotesMessage,
	resetNotesConversation,
} from '../../controllers/chat/index.js';

const router = Router();

router.get('/messages', getOlderNotesMessages);
router.get('/messages/reactions', getNotesMessageReactionUsers);
router.post('/open', openNotesConversation);
router.post('/reset', resetNotesConversation);
router.post('/messages', createNotesChatMessage);
router.post('/messages/edit', editNotesMessage);
router.post('/messages/delete', deleteNotesMessage);
router.post('/messages/react', reactToNotesMessage);

export default router;
