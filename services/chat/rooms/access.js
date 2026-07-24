//! services/chat/rooms/access.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import ChatConversationMembersModel from '../../../models/chat/ConversationMembers.js';
import { canChatMemberWrite } from '../../../constants/chat.js';
import { formatOpenRoomConversation } from './formatters.js';

/**
 * Join one public room and return its open conversation data.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function joinPublicRoom({ conversationId, userId }) {
	const membership = await ChatRoomsModel.joinPublicRoomConversation({
		conversationId,
		userId,
	});

	if (!membership) {
		return null;
	}

	return getOpenRoomConversation(conversationId, userId);
}

/**
 * Check whether one room conversation can be opened by a user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export function findOpenableRoomConversation(conversationId, userId) {
	return ChatRoomsModel.findVisibleRoomConversationForUser(
		conversationId,
		userId,
	);
}

/**
 * Check whether one room conversation can receive messages from a user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findWritableRoomConversation(conversationId, userId) {
	const room = await findOpenableRoomConversation(conversationId, userId);

	if (!room || !canChatMemberWrite(room.member_status)) {
		return null;
	}

	return room;
}

/**
 * Find one openable room conversation with display data.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getOpenRoomConversation(conversationId, userId) {
	const room = await findOpenableRoomConversation(conversationId, userId);
	return room ? formatOpenRoomConversation(room) : null;
}

/**
 * Mark an openable room conversation read through its latest message.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function markRoomConversationRead(conversationId, userId) {
	const room = await findOpenableRoomConversation(conversationId, userId);

	if (!room) {
		return null;
	}

	return ChatConversationMembersModel.markReadThroughLatestMessage(
		room.conversation_id,
		userId,
	);
}
