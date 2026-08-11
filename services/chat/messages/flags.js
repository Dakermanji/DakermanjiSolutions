//! services/chat/messages/flags.js

import { CHAT_ROOM_ACTIVITY_ACTIONS } from '../../../constants/chat.js';
import ChatMessagesModel from '../../../models/chat/Messages.js';
import {
	findOpenableRoomConversation,
	recordRoomActivity,
} from '../rooms.js';

const CHAT_MESSAGE_FLAG_ACTIVITY_ENTITY_TYPE = 'chat_message_flag';

/**
 * Flag one room message for owner/admin review.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.flaggedByUserId
 * @returns {Promise<object|null>}
 */
export async function flagRoomMessage({
	conversationId,
	messageId,
	flaggedByUserId,
}) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		flaggedByUserId,
	);

	if (!conversation) {
		return null;
	}

	const flag = await ChatMessagesModel.createMessageFlag({
		conversationId: conversation.conversation_id,
		messageId,
		flaggedByUserId,
	});

	if (flag?.created) {
		await recordRoomActivity({
			roomId: conversation.room_id,
			conversationId: conversation.conversation_id,
			actorUserId: flaggedByUserId,
			targetUserId: flag.sender_user_id,
			action: CHAT_ROOM_ACTIVITY_ACTIONS.MESSAGE_FLAGGED,
			entityType: CHAT_MESSAGE_FLAG_ACTIVITY_ENTITY_TYPE,
			entityId: flag.id,
			metadata: {
				messageId: flag.message_id,
			},
		});
	}

	return flag;
}
