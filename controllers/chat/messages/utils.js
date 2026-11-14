//! controllers/chat/messages/utils.js

import { findOpenableRoomConversation } from '../../../services/chat/rooms.js';
import { canChatMemberWrite } from '../../../services/chat/rooms/permissions.js';
import { CHAT_OPEN_REDIRECT } from '../../../constants/chat.js';

export async function getRoomMessageFailureKey(conversationId, userId) {
	const room = await findOpenableRoomConversation(conversationId, userId);

	if (!room) {
		return 'chat:rooms.openError';
	}

	if (!canChatMemberWrite(room.member_status)) {
		return 'chat:conversation.mutedMessageError';
	}

	return 'chat:conversation.messageError';
}

export function wantsJson(req) {
	return req.xhr || req.accepts(['html', 'json']) === 'json';
}

export function getRequestConversationId(req, kind) {
	return kind === 'self'
		? req.chatNotesConversationId || null
		: req.session.chat?.activeConversationId || null;
}

export function getMessageRedirect(kind) {
	return kind === 'self' ? '/chat/notes' : CHAT_OPEN_REDIRECT;
}
