//! services/chat/live.js

import {
	createFriendMessage,
	createRoomMessage,
	deleteOwnMessage,
	editOwnMessage,
	findOpenableFriendConversation,
} from './messages.js';
import {
	countUnreadFriendMessages,
	markFriendConversationRead,
} from './friends.js';
import {
	findOpenableRoomConversation,
	countUnreadPrivateRoomMessages,
	countUnreadPublicRoomMessages,
	markRoomConversationRead,
} from './rooms.js';
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
 * Broadcast one edited message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @returns {void}
 */
export function emitChatMessageEdited(message) {
	if (!chatSocketServer || !message?.conversationId) return;

	chatSocketServer
		.to(getChatConversationRoom(message.conversationId))
		.emit('chat:message:edited', {
			message,
		});
}

/**
 * Broadcast one deleted message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @returns {Promise<void>}
 */
export async function emitChatMessageDeleted(message) {
	if (!chatSocketServer || !message?.conversation_id) return;

	chatSocketServer
		.to(getChatConversationRoom(message.conversation_id))
		.emit('chat:message:deleted', {
			conversationId: message.conversation_id,
			messageId: message.id,
		});

	await emitChatUnreadCountsForConversation(message.conversation_id);
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
		const [
			unreadFriendCount,
			unreadPrivateRoomCount,
			unreadPublicRoomCount,
		] = await Promise.all([
			countUnreadFriendMessages(userId),
			countUnreadPrivateRoomMessages(userId),
			countUnreadPublicRoomMessages(userId),
		]);
		const unreadRoomCount = unreadPrivateRoomCount + unreadPublicRoomCount;
		const unreadCount = unreadFriendCount + unreadRoomCount;

		chatSocketServer
			.to(getChatUserRoom(userId))
			.emit('chat:unread:changed', {
				unreadCount,
				sections: {
					friends: unreadFriendCount,
					privateRooms: unreadPrivateRoomCount,
					publicRooms: unreadPublicRoomCount,
				},
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

async function findOpenableConversation(conversationId, userId) {
	const friendConversation = await findOpenableFriendConversation(
		conversationId,
		userId,
	);

	if (friendConversation) {
		return {
			kind: 'friend',
			conversation: friendConversation,
		};
	}

	const roomConversation = await findOpenableRoomConversation(
		conversationId,
		userId,
	);

	if (roomConversation) {
		return {
			kind: 'room',
			conversation: roomConversation,
		};
	}

	return null;
}

async function createChatMessageForConversation({
	kind,
	conversationId,
	senderUserId,
	body,
}) {
	if (kind === 'room') {
		return createRoomMessage({
			conversationId,
			senderUserId,
			body,
		});
	}

	return createFriendMessage({
		conversationId,
		senderUserId,
		body,
	});
}

async function markConversationRead({ kind, conversationId, userId }) {
	if (kind === 'room') {
		await markRoomConversationRead(conversationId, userId);
		return;
	}

	await markFriendConversationRead(conversationId, userId);
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
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledge?.({
					ok: false,
				});
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
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			const message = await createChatMessageForConversation({
				kind: openConversation.kind,
				conversationId: openConversation.conversation.conversation_id,
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

	socket.on('chat:message:edit', async (payload, acknowledge) => {
		const conversationId = String(payload?.conversationId || '').trim();
		const messageId = String(payload?.messageId || '').trim();

		if (!isValidUuid(conversationId) || !isValidUuid(messageId)) {
			acknowledge?.({
				ok: false,
			});
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			const message = await editOwnMessage({
				kind: openConversation.kind,
				conversationId: openConversation.conversation.conversation_id,
				messageId,
				senderUserId: socket.data.userId,
				body: payload?.message,
			});

			if (!message) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			emitChatMessageEdited(message);

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

	socket.on('chat:message:delete', async (payload, acknowledge) => {
		const conversationId = String(payload?.conversationId || '').trim();
		const messageId = String(payload?.messageId || '').trim();

		if (!isValidUuid(conversationId) || !isValidUuid(messageId)) {
			acknowledge?.({
				ok: false,
			});
			return;
		}

		try {
			const openConversation = await findOpenableConversation(
				conversationId,
				socket.data.userId,
			);

			if (!openConversation) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			const message = await deleteOwnMessage({
				kind: openConversation.kind,
				conversationId: openConversation.conversation.conversation_id,
				messageId,
				senderUserId: socket.data.userId,
			});

			if (!message) {
				acknowledge?.({
					ok: false,
				});
				return;
			}

			await emitChatMessageDeleted(message);

			acknowledge?.({
				ok: true,
				conversationId: message.conversation_id,
				messageId: message.id,
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

export default {
	emitChatMessageCreated,
	emitChatMessageDeleted,
	emitChatMessageEdited,
	emitChatUnreadCountsChanged,
	emitChatUnreadCountsForConversation,
	getChatConversationRoom,
	getChatUserRoom,
	registerChatSocketHandlers,
	setChatSocketServer,
};
