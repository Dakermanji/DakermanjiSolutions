//! controllers/chat/messages/mutations.js

import {
	deleteOwnMessage,
	editOwnMessage,
} from '../../../services/chat/messages.js';
import {
	emitChatMessageDeleted,
	emitChatMessageEdited,
} from '../../../services/chat/live.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { CHAT_OPEN_REDIRECT } from '../../../constants/chat.js';

const MESSAGE_MUTATION_HANDLERS = {
	friend: {
		editSuccessKey: 'chat:conversation.editSuccess',
		editErrorKey: 'chat:conversation.editError',
		deleteSuccessKey: 'chat:conversation.deleteSuccess',
		deleteErrorKey: 'chat:conversation.deleteError',
	},
	room: {
		editSuccessKey: 'chat:conversation.editSuccess',
		editErrorKey: 'chat:conversation.editError',
		deleteSuccessKey: 'chat:conversation.deleteSuccess',
		deleteErrorKey: 'chat:conversation.deleteError',
	},
};

function getActiveMessageMutationInput(req) {
	return {
		conversationId: req.session.chat?.activeConversationId || null,
		messageId: String(req.body?.messageId || '').trim(),
		body: req.body?.message,
	};
}

function hasValidMessageMutationIds({ conversationId, messageId }) {
	return Boolean(
		conversationId &&
		messageId &&
		isValidUuid(conversationId) &&
		isValidUuid(messageId),
	);
}

function createMessageEditHandler(kind) {
	const config = MESSAGE_MUTATION_HANDLERS[kind];

	return async function editChatMessage(req, res, next) {
		const input = getActiveMessageMutationInput(req);

		if (!hasValidMessageMutationIds(input)) {
			req.flash('error', config.editErrorKey);
			return res.redirect(CHAT_OPEN_REDIRECT);
		}

		try {
			const message = await editOwnMessage({
				kind,
				conversationId: input.conversationId,
				messageId: input.messageId,
				senderUserId: req.user.id,
				body: input.body,
			});

			if (!message) {
				req.flash('error', config.editErrorKey);
			} else {
				emitChatMessageEdited(message);
				req.flash('success', config.editSuccessKey);
			}

			return res.redirect(CHAT_OPEN_REDIRECT);
		} catch (error) {
			return next(error);
		}
	};
}

function createMessageDeleteHandler(kind) {
	const config = MESSAGE_MUTATION_HANDLERS[kind];

	return async function deleteChatMessage(req, res, next) {
		const input = getActiveMessageMutationInput(req);

		if (!hasValidMessageMutationIds(input)) {
			req.flash('error', config.deleteErrorKey);
			return res.redirect(CHAT_OPEN_REDIRECT);
		}

		try {
			const deletedMessage = await deleteOwnMessage({
				kind,
				conversationId: input.conversationId,
				messageId: input.messageId,
				senderUserId: req.user.id,
			});

			if (!deletedMessage) {
				req.flash('error', config.deleteErrorKey);
			} else {
				await emitChatMessageDeleted(deletedMessage);
				req.flash('success', config.deleteSuccessKey);
			}

			return res.redirect(CHAT_OPEN_REDIRECT);
		} catch (error) {
			return next(error);
		}
	};
}

export const editFriendChatMessage = createMessageEditHandler('friend');
export const deleteFriendChatMessage = createMessageDeleteHandler('friend');
export const editRoomChatMessage = createMessageEditHandler('room');
export const deleteRoomChatMessage = createMessageDeleteHandler('room');
