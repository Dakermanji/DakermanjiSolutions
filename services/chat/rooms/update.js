//! services/chat/rooms/update.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import { CHAT_ROOM_ACTIVITY_ACTIONS } from '../../../constants/chat.js';
import { validateUpdateRoomInput } from '../../../middlewares/validators/chat.js';
import { getRoomSettings } from './helpers.js';
import { recordRoomActivity } from './activity.js';

const CHAT_ROOM_ACTIVITY_ENTITY_TYPE = 'chat_room';

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

	if (room?.changed_fields?.length > 0) {
		await recordRoomActivity({
			roomId: room.room_id,
			conversationId: room.conversation_id,
			actorUserId: validation.values.actorUserId,
			action: CHAT_ROOM_ACTIVITY_ACTIONS.ROOM_INFO_UPDATED,
			entityType: CHAT_ROOM_ACTIVITY_ENTITY_TYPE,
			entityId: room.room_id,
			metadata: {
				roomName: room.title,
				changedFields: room.changed_fields,
			},
		});
	}

	return {
		errors: room ? {} : { room: 'Room could not be updated.' },
		room,
	};
}
