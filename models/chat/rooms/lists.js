//! models/chat/rooms/lists.js

import { queryRows } from '../../../config/database.js';
import { CHAT_ROOM_VISIBILITY } from '../../../constants/chat.js';
import {
	buildVisibleRoomsCountQuery,
	buildVisibleRoomsQuery,
} from './queries.js';

/**
 * Find joined public rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export function findPublicRoomsForUser(userId) {
	return queryRows(
		buildVisibleRoomsQuery('cr.visibility = $2'),
		[userId, CHAT_ROOM_VISIBILITY.PUBLIC],
	);
}

/**
 * Count joined public rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countPublicRoomsForUser(userId) {
	const rows = await queryRows(
		buildVisibleRoomsCountQuery('cr.visibility = $2'),
		[userId, CHAT_ROOM_VISIBILITY.PUBLIC],
	);

	return rows[0]?.room_count || 0;
}

/**
 * Find joined private rooms visible to one user.
 *
 * Includes listed and unlisted private rooms once the user is a member.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export function findPrivateRoomsForUser(userId) {
	return queryRows(
		buildVisibleRoomsQuery('cr.visibility IN ($2, $3)'),
		[
			userId,
			CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
			CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED,
		],
	);
}

/**
 * Count joined private rooms visible to one user.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countPrivateRoomsForUser(userId) {
	const rows = await queryRows(
		buildVisibleRoomsCountQuery('cr.visibility IN ($2, $3)'),
		[
			userId,
			CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
			CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED,
		],
	);

	return rows[0]?.room_count || 0;
}

