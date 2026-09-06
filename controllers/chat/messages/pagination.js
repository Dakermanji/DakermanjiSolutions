//! controllers/chat/messages/pagination.js

import {
	listOlderFriendMessages,
	listOlderNotesMessages,
	listOlderRoomMessages,
} from '../../../services/chat/messages.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';

function getOlderMessagesInput(req) {
	return {
		activeConversationId: req.session.chat?.activeConversationId || null,
		beforeId: String(req.query?.beforeId || '').trim(),
	};
}

function hasValidOlderMessagesInput({ activeConversationId, beforeId }) {
	return Boolean(
		activeConversationId &&
		isValidUuid(activeConversationId) &&
		isValidUuid(beforeId),
	);
}

function createOlderMessagesHandler(kind) {
	const listMessages = kind === 'room'
		? listOlderRoomMessages
		: kind === 'self'
			? listOlderNotesMessages
			: listOlderFriendMessages;

	return async function getOlderMessages(req, res, next) {
		const input = getOlderMessagesInput(req);

		if (!hasValidOlderMessagesInput(input)) {
			return res.status(400).json({
				ok: false,
			});
		}

		try {
			const page = await listMessages({
				conversationId: input.activeConversationId,
				viewerUserId: req.user.id,
				beforeId: input.beforeId,
			});

			if (!page) {
				return res.status(404).json({
					ok: false,
				});
			}

			return res.json({
				ok: true,
				...page,
			});
		} catch (error) {
			return next(error);
		}
	};
}

export const getOlderFriendMessages = createOlderMessagesHandler('friend');
export const getOlderNotesMessages = createOlderMessagesHandler('self');
export const getOlderRoomMessages = createOlderMessagesHandler('room');
