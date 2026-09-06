//! services/chat/notes.js

import ChatConversationMembersModel from '../../models/chat/ConversationMembers.js';
import ChatConversationsModel from '../../models/chat/Conversations.js';
import { CHAT_CONVERSATION_TYPES } from '../../constants/chat.js';
import { getUserAvatarProfile } from '../avatar/dicebear.js';
import { findReadableChatConversation } from './authorization.js';

function formatNotesConversation(conversation) {
	const displayName = conversation.username || conversation.email || '';
	const avatar = getUserAvatarProfile(
		conversation.avatar_seed || displayName || 'notes',
	);

	return {
		kind: 'self',
		conversation: {
			id: conversation.conversation_id,
			lastMessageId: conversation.last_message_id,
			lastMessageCreatedAt: conversation.last_message_created_at,
			lastReadMessageId: conversation.last_read_message_id,
			unreadCount: Number(conversation.unread_count || 0),
			updatedAt: conversation.updated_at,
		},
		self: {
			id: conversation.user_id,
			username: conversation.username,
			email: conversation.email,
			countryCode: conversation.country_code,
			avatar: {
				src: avatar.src,
				background: avatar.background,
			},
		},
	};
}

/**
 * Ensure the signed-in user's self-notes conversation exists.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function ensureNotesConversation(userId) {
	const conversation =
		await ChatConversationsModel.findOrCreateSelfConversation(userId);

	return conversation ? formatNotesConversation(conversation) : null;
}

/**
 * Check whether one self-notes conversation can be opened by a user.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export function findOpenableNotesConversation(conversationId, userId) {
	return findReadableChatConversation({
		conversationId,
		userId,
		type: CHAT_CONVERSATION_TYPES.SELF,
	});
}

/**
 * Find one openable self-notes conversation with display data.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getOpenNotesConversation(conversationId, userId) {
	const readableConversation = await findOpenableNotesConversation(
		conversationId,
		userId,
	);

	if (!readableConversation) {
		return null;
	}

	const conversation =
		await ChatConversationsModel.findSelfConversationForUserById(
			conversationId,
			userId,
		);

	return conversation ? formatNotesConversation(conversation) : null;
}

/**
 * Mark an openable self-notes conversation read through its latest message.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function markNotesConversationRead(conversationId, userId) {
	const conversation = await findOpenableNotesConversation(
		conversationId,
		userId,
	);

	if (!conversation) {
		return null;
	}

	return ChatConversationMembersModel.markReadThroughLatestMessage(
		conversation.conversation_id,
		userId,
	);
}
