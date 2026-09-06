//! services/chat/live/messages.js

import ChatConversationMembersModel from '../../../models/chat/ConversationMembers.js';
import {
	getChatConversationRoom,
	getChatSocketServer,
	getChatUserRoom,
} from './state.js';
import { emitChatUnreadCountsForConversation } from './unread.js';

function getChatMessageEmitRoom(conversationId, options = {}) {
	if (options.targetUserId) {
		return getChatUserRoom(options.targetUserId);
	}

	return getChatConversationRoom(conversationId);
}

/**
 * Broadcast one created message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @param {{targetUserId?: string}=} options
 * @returns {Promise<void>}
 */
export async function emitChatMessageCreated(message, options = {}) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !message?.conversationId) return;

	if (options.targetUserId) {
		chatSocketServer
			.to(getChatMessageEmitRoom(message.conversationId, options))
			.emit('chat:message:created', {
				message,
			});

		return;
	}

	if (message.isPendingReview) {
		const recipientUserIds =
			await ChatConversationMembersModel.findPendingMessageRecipientUserIds({
				conversationId: message.conversationId,
				senderUserId: message.sender?.id,
			});

		for (const userId of new Set(recipientUserIds.filter(Boolean))) {
			chatSocketServer
				.to(getChatUserRoom(userId))
				.emit('chat:message:created', {
					message,
				});
		}

		return;
	}

	chatSocketServer
		.to(getChatMessageEmitRoom(message.conversationId, options))
		.emit('chat:message:created', {
			message,
		});

	await emitChatUnreadCountsForConversation(message.conversationId);
}

/**
 * Broadcast one edited message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @param {{targetUserId?: string}=} options
 * @returns {void}
 */
export function emitChatMessageEdited(message, options = {}) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !message?.conversationId) return;

	chatSocketServer
		.to(getChatMessageEmitRoom(message.conversationId, options))
		.emit('chat:message:edited', {
			message,
		});
}

/**
 * Broadcast reaction summary changes to users currently in the conversation room.
 *
 * @param {object|null} summary
 * @param {{targetUserId?: string}=} options
 * @returns {void}
 */
export function emitChatMessageReactionsChanged(summary, options = {}) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !summary?.conversationId || !summary?.messageId) {
		return;
	}

	chatSocketServer
		.to(getChatMessageEmitRoom(summary.conversationId, options))
		.emit('chat:message:reactions', summary);
}

/**
 * Broadcast one deleted message to users currently in the conversation room.
 *
 * @param {object|null} message
 * @param {{targetUserId?: string}=} options
 * @returns {Promise<void>}
 */
export async function emitChatMessageDeleted(message, options = {}) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer || !message?.conversation_id) return;

	chatSocketServer
		.to(getChatMessageEmitRoom(message.conversation_id, options))
		.emit('chat:message:deleted', {
			conversationId: message.conversation_id,
			messageId: message.id,
		});

	if (options.targetUserId) return;

	await emitChatUnreadCountsForConversation(message.conversation_id);
}
