//! controllers/chat/messages/utils.js

import { findOpenableRoomConversation } from '../../../services/chat/rooms.js';
import { canChatMemberWrite } from '../../../services/chat/rooms/permissions.js';

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
