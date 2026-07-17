//! services/chat/rooms.js

import ChatRoomsModel from '../../models/chat/Rooms.js';
import ChatConversationMembersModel from '../../models/chat/ConversationMembers.js';
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

function formatOpenRoomConversation(room) {
	const formatted = formatRoom(room);

	return {
		kind: 'room',
		conversation: {
			id: room.conversation_id,
			lastMessageId: room.last_message_id,
			lastReadMessageId: room.last_read_message_id,
			updatedAt: room.updated_at,
		},
		room: formatted.room,
		owner: formatted.owner,
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

/**
 * Count visible room sections for one user.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function countVisibleRooms(userId) {
	const [privateRooms, publicRooms] = await Promise.all([
		ChatRoomsModel.countPrivateRoomsForUser(userId),
		ChatRoomsModel.countPublicRoomsForUser(userId),
	]);

	return {
		privateRooms,
		publicRooms,
	};
}

export default {
	countVisibleRooms,
	createRoom,
	findOpenableRoomConversation,
	getOpenRoomConversation,
	listPrivateRooms,
	listPublicRooms,
	markRoomConversationRead,
	validateCreateRoomInput,
};
