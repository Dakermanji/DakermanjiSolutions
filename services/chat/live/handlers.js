//! services/chat/live/handlers.js

import { isValidUuid } from '../../../middlewares/validators/common.js';
import {
	createChatMessageForConversation,
	deleteChatMessageForConversation,
	editChatMessageForConversation,
	findOpenableConversation,
	markConversationRead,
} from './conversations.js';
import {
	emitChatMessageCreated,
	emitChatMessageDeleted,
	emitChatMessageEdited,
} from './messages.js';
import { emitChatUnreadCountsChanged } from './unread.js';
import { getChatConversationRoom } from './state.js';

function acknowledgeFailure(acknowledge) {
	acknowledge?.({
		ok: false,
	});
}

/**
 * Register chat-specific socket handlers.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @returns {void}
 */
export function registerChatSocketHandlers(io, socket) {
	socket.on('chat:conversation:join', async (payload, acknowledge) => {
		const conversationId = String(payload?.conversationId || '').trim();

		if (!isValidUuid(conversationId)) {
			acknowledgeFailure(acknowledge);
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledgeFailure(acknowledge);
				return;
			}

			socket.join(
				getChatConversationRoom(
					openConversation.conversation.conversation_id,
				),
			);
			acknowledge?.({
				ok: true,
			});
		} catch {
			acknowledgeFailure(acknowledge);
		}
	});

	socket.on('chat:message:create', async (payload, acknowledge) => {
		const conversationId = String(payload?.conversationId || '').trim();

		if (!isValidUuid(conversationId)) {
			acknowledgeFailure(acknowledge);
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledgeFailure(acknowledge);
				return;
			}

			const message = await createChatMessageForConversation({
				kind: openConversation.kind,
				conversationId: openConversation.conversation.conversation_id,
				senderUserId: socket.data.userId,
				replyToMessageId: payload?.replyToMessageId,
				body: payload?.message,
			});

			if (!message) {
				acknowledgeFailure(acknowledge);
				return;
			}

			await emitChatMessageCreated(message);

			acknowledge?.({
				ok: true,
				message,
			});
		} catch {
			acknowledgeFailure(acknowledge);
		}
	});

	socket.on('chat:message:edit', async (payload, acknowledge) => {
		const conversationId = String(payload?.conversationId || '').trim();
		const messageId = String(payload?.messageId || '').trim();

		if (!isValidUuid(conversationId) || !isValidUuid(messageId)) {
			acknowledgeFailure(acknowledge);
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledgeFailure(acknowledge);
				return;
			}

			const message = await editChatMessageForConversation({
				kind: openConversation.kind,
				conversationId: openConversation.conversation.conversation_id,
				messageId,
				senderUserId: socket.data.userId,
				body: payload?.message,
			});

			if (!message) {
				acknowledgeFailure(acknowledge);
				return;
			}

			emitChatMessageEdited(message);

			acknowledge?.({
				ok: true,
				message,
			});
		} catch {
			acknowledgeFailure(acknowledge);
		}
	});

	socket.on('chat:message:delete', async (payload, acknowledge) => {
		const conversationId = String(payload?.conversationId || '').trim();
		const messageId = String(payload?.messageId || '').trim();

		if (!isValidUuid(conversationId) || !isValidUuid(messageId)) {
			acknowledgeFailure(acknowledge);
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledgeFailure(acknowledge);
				return;
			}

			const message = await deleteChatMessageForConversation({
				kind: openConversation.kind,
				conversationId: openConversation.conversation.conversation_id,
				messageId,
				senderUserId: socket.data.userId,
			});

			if (!message) {
				acknowledgeFailure(acknowledge);
				return;
			}

			await emitChatMessageDeleted(message);

			acknowledge?.({
				ok: true,
				conversationId: message.conversation_id,
				messageId: message.id,
			});
		} catch {
			acknowledgeFailure(acknowledge);
		}
	});

	socket.on('chat:typing:update', async (payload) => {
		const conversationId = String(payload?.conversationId || '').trim();

		if (!isValidUuid(conversationId)) {
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				return;
			}

			socket
				.to(
					getChatConversationRoom(
						openConversation.conversation.conversation_id,
					),
				)
				.emit('chat:typing:updated', {
					conversationId: openConversation.conversation.conversation_id,
					userId: socket.data.userId,
					userName: socket.data.userDisplayName || '',
					isTyping: Boolean(payload?.isTyping),
				});
		} catch {
			// Typing indicators are ephemeral; failed updates can be ignored.
		}
	});

	socket.on('chat:conversation:read', async (payload) => {
		const conversationId = String(payload?.conversationId || '').trim();

		if (!isValidUuid(conversationId)) {
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				return;
			}

			await markConversationRead({
				kind: openConversation.kind,
				conversationId: openConversation.conversation.conversation_id,
				userId: socket.data.userId,
			});
			await emitChatUnreadCountsChanged([socket.data.userId]);
		} catch {
			// Read receipt updates are recoverable on the next page request.
		}
	});
}
