//! services/chat/rooms/lists.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import ChatRoomJoinRequestsModel from '../../../models/chat/RoomJoinRequests.js';
import { CHAT_ROOM_LIMITS } from '../../../constants/chat.js';
import {
	escapeLikePattern,
	normalizeSearchQuery,
} from './helpers.js';
import {
	formatPendingRoomRequest,
	formatRoom,
	formatSearchRoom,
} from './formatters.js';

const { SEARCH_RESULT_LIMIT } = CHAT_ROOM_LIMITS;

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
 * List private rooms and pending private room requests visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function listPrivateRoomSection(userId) {
	const [rooms, pendingRequests] = await Promise.all([
		ChatRoomsModel.findPrivateRoomsForUser(userId),
		ChatRoomJoinRequestsModel.findPendingRequestsForUser(userId),
	]);

	return {
		rooms: rooms.map(formatRoom),
		pendingRequests: pendingRequests.map(formatPendingRoomRequest),
	};
}

/**
 * Search public/listed rooms plus joined unlisted rooms for one user.
 *
 * @param {string} userId
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchRooms(userId, query) {
	const normalizedQuery = normalizeSearchQuery(query);

	if (!normalizedQuery) {
		return [];
	}

	const rooms = await ChatRoomsModel.searchVisibleRoomsForUser({
		userId,
		query: `%${escapeLikePattern(normalizedQuery)}%`,
		limit: SEARCH_RESULT_LIMIT,
	});

	return rooms.map(formatSearchRoom);
}

/**
 * Count visible room sections for one user.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function countVisibleRooms(userId) {
	const [
		privateRooms,
		publicRooms,
		unreadPrivateRooms,
		unreadPublicRooms,
	] = await Promise.all([
		ChatRoomsModel.countPrivateRoomsForUser(userId),
		ChatRoomsModel.countPublicRoomsForUser(userId),
		ChatRoomsModel.countUnreadPrivateRoomMessagesForUser(userId),
		ChatRoomsModel.countUnreadPublicRoomMessagesForUser(userId),
	]);

	return {
		privateRooms,
		publicRooms,
		unreadPrivateRooms,
		unreadPublicRooms,
	};
}

/**
 * Count unread room messages for one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export function countUnreadRoomMessages(userId) {
	return ChatRoomsModel.countUnreadRoomMessagesForUser(userId);
}

/**
 * Count unread private room messages for one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export function countUnreadPrivateRoomMessages(userId) {
	return ChatRoomsModel.countUnreadPrivateRoomMessagesForUser(userId);
}

/**
 * Count unread public room messages for one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export function countUnreadPublicRoomMessages(userId) {
	return ChatRoomsModel.countUnreadPublicRoomMessagesForUser(userId);
}
