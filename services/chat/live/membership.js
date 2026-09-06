//! services/chat/live/membership.js

import {
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_WRITE_STATUSES,
} from '../../../constants/chat.js';
import {
	getChatConversationRoom,
	getChatSocketServer,
	getChatUserRoom,
} from './state.js';

function canReadChatMembership(member) {
	return (
		!member.archived_at
		&& CHAT_CONVERSATION_MEMBER_READ_STATUSES.includes(member.status)
	);
}

function canWriteChatMembership(member) {
	return (
		!member.archived_at
		&& CHAT_CONVERSATION_MEMBER_WRITE_STATUSES.includes(member.status)
	);
}

/**
 * Notify one user that their room membership changed.
 *
 * @param {object|null} member
 * @returns {void}
 */
export function emitChatRoomMembershipChanged(member) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !member?.conversation_id || !member?.user_id) return;

	const payload = {
		conversationId: member.conversation_id,
		userId: member.user_id,
		role: member.role,
		status: member.status,
		canRead: canReadChatMembership(member),
		canWrite: canWriteChatMembership(member),
	};

	if (!payload.canRead) {
		chatSocketServer
			.in(getChatUserRoom(member.user_id))
			.socketsLeave(getChatConversationRoom(member.conversation_id));
	}

	chatSocketServer
		.to(getChatUserRoom(member.user_id))
		.emit('chat:room:membership:changed', payload);
}