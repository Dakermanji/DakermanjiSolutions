//! services/chat/live.js

import {
	createFriendMessage,
	findOpenableFriendConversation,
} from './messages.js';
import {
	countUnreadFriendMessages,
	getOpenFriendConversation,
	markFriendConversationRead,
} from './friends.js';
import ChatConversationMembersModel from '../../models/chat/ConversationMembers.js';
import { isValidUuid } from '../../middlewares/validators/common.js';

let chatSocketServer = null;

export function getChatConversationRoom(conversationId) {
	return `chat:conversation:${conversationId}`;
}

export function getChatUserRoom(userId) {
	return `chat:user:${userId}`;
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
export async function emitChatMessageCreated(message) {
	if (!chatSocketServer || !message?.conversationId) return;

	chatSocketServer
		.to(getChatConversationRoom(message.conversationId))
		.emit('chat:message:created', {
			message,
		});

	await emitChatUnreadCountsForConversation(message.conversationId);
}

/**
 * Emit fresh unread counts to selected users.
 *
 * @param {Array<string | null | undefined>} userIds
 * @returns {Promise<void>}
 */
export async function emitChatUnreadCountsChanged(userIds) {
	if (!chatSocketServer) return;

	for (const userId of new Set(userIds.filter(Boolean))) {
		const unreadCount = await countUnreadFriendMessages(userId);

		chatSocketServer
			.to(getChatUserRoom(userId))
			.emit('chat:unread:changed', {
				unreadCount,
			});
	}
}

/**
 * Emit fresh unread counts to all members of one conversation.
 *
 * @param {string} conversationId
 * @returns {Promise<void>}
 */
export async function emitChatUnreadCountsForConversation(conversationId) {
	const userIds =
		await ChatConversationMembersModel.findConversationMemberUserIds(
			conversationId,
		);

	await emitChatUnreadCountsChanged(userIds);
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

			await emitChatMessageCreated(message);

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

	socket.on('chat:typing:update', async (payload) => {
		const conversationId = String(payload?.conversationId || '').trim();

		if (!isValidUuid(conversationId)) {
			return;
		}

		try {
			const conversation = await findOpenableFriendConversation(
				conversationId,
				socket.data.userId,
			);

			if (!conversation) {
				return;
			}

			socket.to(getChatConversationRoom(conversation.conversation_id)).emit(
				'chat:typing:updated',
				{
					conversationId: conversation.conversation_id,
					userId: socket.data.userId,
					isTyping: Boolean(payload?.isTyping),
				},
			);
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
			await markFriendConversationRead(conversationId, socket.data.userId);
			await emitChatUnreadCountsChanged([socket.data.userId]);
		} catch {
			// Read receipt updates are recoverable on the next page request.
		}
	});
}

export default {
	emitChatMessageCreated,
	emitChatUnreadCountsChanged,
	emitChatUnreadCountsForConversation,
	getChatConversationRoom,
	getChatUserRoom,
	registerChatSocketHandlers,
	setChatSocketServer,
};
