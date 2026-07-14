//! services/chat/live.js

import {
	createFriendMessage,
	findOpenableFriendConversation,
} from './messages.js';
import { getOpenFriendConversation } from './friends.js';
import { isValidUuid } from '../../middlewares/validators/common.js';

let chatSocketServer = null;

export function getChatConversationRoom(conversationId) {
	return `chat:conversation:${conversationId}`;
}

/**
 * Register the Socket.IO server used for chat events.
 *
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
export function setChatSocketServer(io) {
	chatSocketServer = io;
}

/**
 * Broadcast one created message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @returns {void}
 */
export function emitChatMessageCreated(message) {
	if (!chatSocketServer || !message?.conversationId) return;

	chatSocketServer
		.to(getChatConversationRoom(message.conversationId))
		.emit('chat:message:created', {
			message,
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
			acknowledge?.({
				ok: false,
			});
			return;
		}

		try {
			const conversation = await getOpenFriendConversation(
				conversationId,
				socket.data.userId,
			);

			if (!conversation) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			socket.join(getChatConversationRoom(conversation.conversation.id));
			acknowledge?.({
				ok: true,
			});
		} catch {
			acknowledge?.({
				ok: false,
			});
		}
	});

	socket.on('chat:message:create', async (payload, acknowledge) => {
		const conversationId = String(payload?.conversationId || '').trim();

		if (!isValidUuid(conversationId)) {
			acknowledge?.({
				ok: false,
			});
			return;
		}

		try {
			const conversation = await findOpenableFriendConversation(
				conversationId,
				socket.data.userId,
			);

			if (!conversation) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			const message = await createFriendMessage({
				conversationId: conversation.conversation_id,
				senderUserId: socket.data.userId,
				body: payload?.message,
			});

			if (!message) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			io.to(getChatConversationRoom(message.conversationId)).emit(
				'chat:message:created',
				{
					message,
				},
			);

			acknowledge?.({
				ok: true,
				message,
			});
		} catch {
			acknowledge?.({
				ok: false,
			});
		}
	});
}

export default {
	emitChatMessageCreated,
	getChatConversationRoom,
	registerChatSocketHandlers,
	setChatSocketServer,
};
