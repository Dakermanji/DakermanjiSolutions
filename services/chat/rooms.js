//! services/chat/rooms.js

import ChatRoomsModel from '../../models/chat/Rooms.js';
import {
	CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES,
	CHAT_ROOM_VISIBILITY_JOIN_POLICIES,
} from '../../constants/chat.js';
import { validateCreateRoomInput } from '../../middlewares/validators/chat.js';

function getRoomSettings(visibility) {
	return {
		conversationType: CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES[visibility],
		joinPolicy: CHAT_ROOM_VISIBILITY_JOIN_POLICIES[visibility],
	};
}

function formatRoom(room) {
	const ownerName = room.owner_username || room.owner_email || '';

	return {
		room: {
			id: room.room_id,
			conversationId: room.conversation_id,
			title: room.title,
			description: room.description,
			visibility: room.visibility,
			joinPolicy: room.join_policy,
			memberRole: room.member_role,
			lastMessageId: room.last_message_id,
			lastMessageCreatedAt: room.last_message_created_at,
			lastReadMessageId: room.last_read_message_id,
			unreadCount: Number(room.unread_count || 0),
			updatedAt: room.updated_at,
		},
		owner: {
			id: room.created_by_user_id,
			username: room.owner_username,
			email: room.owner_email,
			displayName: ownerName,
		},
	};
}

/**
 * Create a room conversation after normalizing and validating input.
 *
 * @param {object} input
 * @param {string} input.ownerUserId
 * @param {string} input.name
 * @param {string|null} input.description
 * @param {string} input.visibility
 * @returns {Promise<object>}
 */
export async function createRoom(input) {
	const validation = validateCreateRoomInput(input);
	const settings = validation.isValid
		? getRoomSettings(validation.values.visibility)
		: { conversationType: null, joinPolicy: null };

	if (!validation.isValid || !settings.conversationType || !settings.joinPolicy) {
		return {
			errors: {
				...validation.errors,
				...(!settings.conversationType || !settings.joinPolicy
					? { visibility: 'Room visibility is not supported.' }
					: {}),
			},
			room: null,
		};
	}

	const room = await ChatRoomsModel.createRoomConversation({
		...validation.values,
		...settings,
	});

	return {
		errors: {},
		room,
	};
}

/**
 * List public rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function listPublicRooms(userId) {
	const rooms = await ChatRoomsModel.findPublicRoomsForUser(userId);
	return rooms.map(formatRoom);
}

/**
 * List private rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function listPrivateRooms(userId) {
	const rooms = await ChatRoomsModel.findPrivateRoomsForUser(userId);
	return rooms.map(formatRoom);
}

export default {
	createRoom,
	listPrivateRooms,
	listPublicRooms,
	validateCreateRoomInput,
};
