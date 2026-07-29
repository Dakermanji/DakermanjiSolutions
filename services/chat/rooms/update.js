//! services/chat/rooms/update.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import { validateUpdateRoomInput } from '../../../middlewares/validators/chat.js';
import { getRoomSettings } from './helpers.js';

/**
 * Update a room conversation after normalizing and validating input.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.name
 * @param {string|null} input.description
 * @param {string|Array<string>} input.keywords
 * @param {string} input.visibility
 * @returns {Promise<object>}
 */
export async function updateRoom(input) {
	const validation = validateUpdateRoomInput(input);
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

	const room = await ChatRoomsModel.updateRoomConversation({
		...validation.values,
		...settings,
	});

	return {
		errors: room ? {} : { room: 'Room could not be updated.' },
		room,
	};
}
