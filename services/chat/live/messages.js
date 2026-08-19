//! services/chat/live/messages.js

import {
	getChatConversationRoom,
	getChatSocketServer,
} from './state.js';
import { emitChatUnreadCountsForConversation } from './unread.js';

/**
 * Broadcast one created message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @returns {Promise<void>}
 */
export async function emitChatMessageCreated(message) {
	const chatSocketServer = getChatSocketServer();
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
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !message?.conversationId) return;

	chatSocketServer
		.to(getChatConversationRoom(message.conversationId))
		.emit('chat:message:edited', {
			message,
		});
}

/**
 * Broadcast reaction summary changes to users currently in the conversation room.
 *
 * @param {object|null} summary
 * @returns {void}
 */
export function emitChatMessageReactionsChanged(summary) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !summary?.conversationId || !summary?.messageId) {
		return;
	}

	chatSocketServer
		.to(getChatConversationRoom(summary.conversationId))
		.emit('chat:message:reactions', summary);
}

/**
 * Broadcast one deleted message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @returns {Promise<void>}
 */
export async function emitChatMessageDeleted(message) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !message?.conversation_id) return;

	chatSocketServer
		.to(getChatConversationRoom(message.conversation_id))
		.emit('chat:message:deleted', {
			conversationId: message.conversation_id,
			messageId: message.id,
		});

	await emitChatUnreadCountsForConversation(message.conversation_id);
}

