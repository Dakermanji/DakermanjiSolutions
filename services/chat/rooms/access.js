//! services/chat/rooms/access.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import ChatConversationMembersModel from '../../../models/chat/ConversationMembers.js';
import { formatOpenRoomConversation } from './formatters.js';
import { recordRoomMemberJoinedActivity } from './activity.js';
import { canChatMemberWrite } from './permissions.js';

/**
 * Join one public room and return its open conversation data.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function joinPublicRoom({ conversationId, userId }) {
	if (!conversationId || !userId) {
		return null;
	}

	const existingRoom = await findOpenableRoomConversation(conversationId, userId);
	if (existingRoom) {
		return formatOpenRoomConversation(existingRoom);
	}

	const membership = await ChatRoomsModel.joinPublicRoomConversation({
		conversationId,
		userId,
	});

	if (!membership) {
		return null;
	}

	const room = await findOpenableRoomConversation(conversationId, userId);
	if (room) {
		await recordRoomMemberJoinedActivity({
			room,
			memberUserId: userId,
			joinSource: 'public_join',
		});
	}

	return room ? formatOpenRoomConversation(room) : null;
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
