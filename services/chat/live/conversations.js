//! services/chat/live/conversations.js

import {
	createFriendMessage,
	createRoomMessage,
	deleteOwnMessage,
	editOwnMessage,
	findOpenableFriendConversation,
} from '../messages.js';
import { markFriendConversationRead } from '../friends.js';
import {
	findOpenableRoomConversation,
	markRoomConversationRead,
} from '../rooms.js';

export async function findOpenableConversation(conversationId, userId) {
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

export async function createChatMessageForConversation({
	kind,
	conversationId,
	senderUserId,
	replyToMessageId = null,
	body,
}) {
	if (kind === 'room') {
		return createRoomMessage({
			conversationId,
			senderUserId,
			replyToMessageId,
			body,
		});
	}

	return createFriendMessage({
		conversationId,
		senderUserId,
		replyToMessageId,
		body,
	});
}

export function editChatMessageForConversation({
	kind,
	conversationId,
	messageId,
	senderUserId,
	body,
}) {
	return editOwnMessage({
		kind,
		conversationId,
		messageId,
		senderUserId,
		body,
	});
}

export function deleteChatMessageForConversation({
	kind,
	conversationId,
	messageId,
	senderUserId,
}) {
	return deleteOwnMessage({
		kind,
		conversationId,
		messageId,
		senderUserId,
	});
}

export async function markConversationRead({ kind, conversationId, userId }) {
	if (kind === 'room') {
		await markRoomConversationRead(conversationId, userId);
		return;
	}

	await markFriendConversationRead(conversationId, userId);
}
