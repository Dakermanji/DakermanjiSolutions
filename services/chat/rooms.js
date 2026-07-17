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

export default {
	createRoom,
	validateCreateRoomInput,
};
