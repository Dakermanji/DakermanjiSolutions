//! services/chat/messages.js

import ChatMessagesModel from '../../models/chat/Messages.js';
import {
	CHAT_MESSAGE_LIMITS,
	CHAT_ROOM_ACTIVITY_ACTIONS,
} from '../../constants/chat.js';
import {
	findReadableChatConversation,
	findWritableChatConversation,
} from './authorization.js';
import {
	findOpenableRoomConversation,
	findWritableRoomConversation,
	recordRoomActivity,
} from './rooms.js';
import { getUserAvatarProfile } from '../avatar/dicebear.js';

const { BODY_MAX_LENGTH, OLDER_PAGE_SIZE, RECENT_PAGE_SIZE } =
	CHAT_MESSAGE_LIMITS;
const FRIEND_EDIT_DELETE_WINDOW_MS =
	CHAT_MESSAGE_LIMITS.FRIEND_EDIT_DELETE_WINDOW_MS;
const ROOM_EDIT_DELETE_WINDOW_MS =
	CHAT_MESSAGE_LIMITS.ROOM_EDIT_DELETE_WINDOW_MS;
const CHAT_MESSAGE_FLAG_ACTIVITY_ENTITY_TYPE = 'chat_message_flag';
const REPLY_PREVIEW_MAX_LENGTH = 120;

function normalizeMessageBody(body) {
	return String(body || '').trim();
}

function normalizeMessagePreview(body) {
	const preview = String(body || '').replace(/\s+/g, ' ').trim();

	if (preview.length <= REPLY_PREVIEW_MAX_LENGTH) {
		return preview;
	}

	return `${preview.slice(0, REPLY_PREVIEW_MAX_LENGTH - 1)}...`;
}

function formatMessageSender(message) {
	const displayName =
		message.sender_username ||
		message.sender_email ||
		'User';
	const avatar = getUserAvatarProfile(
		message.sender_avatar_seed || displayName,
	);

	return {
		id: message.sender_user_id,
		username: message.sender_username,
		email: message.sender_email,
		displayName,
		countryCode: message.sender_country_code,
		avatar: {
			src: avatar.src,
			background: avatar.background,
		},
	};
}

function formatMessageReply(message) {
	const replyId = message.reply_message_id || message.reply_to_message_id;
	if (!replyId) return null;

	const isDeleted = Boolean(message.reply_deleted_at || !message.reply_message_id);
	const senderDisplayName =
		message.reply_sender_username ||
		message.reply_sender_email ||
		'User';

	return {
		id: replyId,
		isDeleted,
		bodyPreview: isDeleted ? '' : normalizeMessagePreview(message.reply_body),
		sender: {
			id: message.reply_sender_user_id || null,
			username: message.reply_sender_username || null,
			email: message.reply_sender_email || null,
			displayName: senderDisplayName,
		},
	};
}

function formatMessage(message, viewerUserId) {
	const isMine = message.sender_user_id === viewerUserId;
	const pendingFlagCount = Number(message.pending_flag_count || 0);

	return {
		id: message.id,
		conversationId: message.conversation_id,
		body: message.body,
		createdAt: message.created_at,
		updatedAt: message.updated_at,
		editedAt: message.edited_at,
		pendingFlagCount,
		flaggedByViewer: Boolean(message.flagged_by_viewer),
		isMine,
		canEdit: Boolean(message.can_edit ?? (isMine && pendingFlagCount === 0)),
		canDelete: Boolean(message.can_delete ?? (isMine && pendingFlagCount === 0)),
		replyTo: formatMessageReply(message),
		sender: formatMessageSender(message),
	};
}

function formatLiveMessage(message) {
	return {
		id: message.id,
		conversationId: message.conversation_id,
		body: message.body,
		createdAt: message.created_at,
		updatedAt: message.updated_at,
		editedAt: message.edited_at,
		pendingFlagCount: Number(message.pending_flag_count || 0),
		flaggedByViewer: Boolean(message.flagged_by_viewer),
		canEdit: true,
		canDelete: true,
		replyTo: formatMessageReply(message),
		sender: formatMessageSender(message),
	};
}

function getMutationWindowMs(kind) {
	return kind === 'room'
		? ROOM_EDIT_DELETE_WINDOW_MS
		: FRIEND_EDIT_DELETE_WINDOW_MS;
}

function getMessageAgeMs(message) {
	const createdAt = new Date(message.created_at || message.createdAt);
	if (Number.isNaN(createdAt.getTime())) return Number.POSITIVE_INFINITY;

	return Date.now() - createdAt.getTime();
}

function applyMutationPermissions(messages, viewerUserId, kind) {
	const mutationWindowMs = getMutationWindowMs(kind);

	return messages.map((message) => {
		const isMine = message.sender_user_id === viewerUserId;
		const pendingFlagCount = Number(message.pending_flag_count || 0);
		const isInsideWindow = getMessageAgeMs(message) <= mutationWindowMs;
		const canMutate = isMine && pendingFlagCount === 0 && isInsideWindow;

		return {
			...message,
			can_edit: canMutate,
			can_delete: canMutate,
		};
	});
}

function formatMessagePage(messages, viewerUserId, limit) {
	const hasMore = messages.length > limit;
	const pageMessages = hasMore ? messages.slice(1) : messages;

	return {
		hasMore,
		messages: pageMessages.map((message) =>
			formatMessage(message, viewerUserId),
		),
	};
}

function emptyMessagePage() {
	return {
		hasMore: false,
		messages: [],
	};
}

/**
 * Create a friend chat message when the user still has write access.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.senderUserId
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function createFriendMessage({
	conversationId,
	senderUserId,
	body,
}) {
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableChatConversation({
		conversationId,
		userId: senderUserId,
	});

	if (!conversation) {
		return null;
	}

	const message = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		body: normalizedBody,
	});

	return formatLiveMessage(message);
}

/**
 * Flag one room message for owner/admin review.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.flaggedByUserId
 * @returns {Promise<object|null>}
 */
export async function flagRoomMessage({
	conversationId,
	messageId,
	flaggedByUserId,
}) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		flaggedByUserId,
	);

	if (!conversation) {
		return null;
	}

	const flag = await ChatMessagesModel.createMessageFlag({
		conversationId: conversation.conversation_id,
		messageId,
		flaggedByUserId,
	});

	if (flag?.created) {
		await recordRoomActivity({
			roomId: conversation.room_id,
			conversationId: conversation.conversation_id,
			actorUserId: flaggedByUserId,
			targetUserId: flag.sender_user_id,
			action: CHAT_ROOM_ACTIVITY_ACTIONS.MESSAGE_FLAGGED,
			entityType: CHAT_MESSAGE_FLAG_ACTIVITY_ENTITY_TYPE,
			entityId: flag.id,
			metadata: {
				messageId: flag.message_id,
			},
		});
	}

	return flag;
}

async function findWritableConversationForMutation({
	kind,
	conversationId,
	userId,
}) {
	if (kind === 'room') {
		return findWritableRoomConversation(conversationId, userId);
	}

	return findWritableChatConversation({
		conversationId,
		userId,
	});
}

/**
 * Edit one sender-owned message inside the active mutation window.
 *
 * @param {object} input
 * @param {'friend'|'room'} input.kind
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.senderUserId
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function editOwnMessage({
	kind,
	conversationId,
	messageId,
	senderUserId,
	body,
}) {
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableConversationForMutation({
		kind,
		conversationId,
		userId: senderUserId,
	});

	if (!conversation) {
		return null;
	}

	const message = await ChatMessagesModel.updateOwnConversationMessage({
		conversationId: conversation.conversation_id,
		messageId,
		senderUserId,
		body: normalizedBody,
		windowMs: getMutationWindowMs(kind),
	});

	return message ? formatMessage(message, senderUserId) : null;
}

/**
 * Delete one sender-owned message inside the active mutation window.
 *
 * @param {object} input
 * @param {'friend'|'room'} input.kind
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.senderUserId
 * @returns {Promise<object|null>}
 */
export async function deleteOwnMessage({
	kind,
	conversationId,
	messageId,
	senderUserId,
}) {
	const conversation = await findWritableConversationForMutation({
		kind,
		conversationId,
		userId: senderUserId,
	});

	if (!conversation) {
		return null;
	}

	return ChatMessagesModel.deleteOwnConversationMessage({
		conversationId: conversation.conversation_id,
		messageId,
		senderUserId,
		windowMs: getMutationWindowMs(kind),
	});
}

/**
 * Create a room chat message when the user can write in the room.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.senderUserId
 * @param {string} input.body
 * @returns {Promise<object|null>}
 */
export async function createRoomMessage({
	conversationId,
	senderUserId,
	body,
}) {
	const normalizedBody = normalizeMessageBody(body);

	if (!normalizedBody || normalizedBody.length > BODY_MAX_LENGTH) {
		return null;
	}

	const conversation = await findWritableRoomConversation(
		conversationId,
		senderUserId,
	);

	if (!conversation) {
		return null;
	}

	const message = await ChatMessagesModel.createConversationMessage({
		conversationId: conversation.conversation_id,
		senderUserId,
		body: normalizedBody,
	});

	return formatLiveMessage(message);
}

/**
 * Check whether a user can open one friend conversation.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export function findOpenableFriendConversation(conversationId, userId) {
	return findReadableChatConversation({
		conversationId,
		userId,
	});
}

/**
 * List recent messages for an openable friend conversation.
 *
 * @param {string} conversationId
 * @param {string} viewerUserId
 * @returns {Promise<object>}
 */
export async function listFriendMessages(conversationId, viewerUserId) {
	const conversation = await findReadableChatConversation({
		conversationId,
		userId: viewerUserId,
	});

	if (!conversation) {
		return emptyMessagePage();
	}

	const messages = await ChatMessagesModel.findRecentConversationMessages(
		conversation.conversation_id,
		RECENT_PAGE_SIZE + 1,
		viewerUserId,
	);

	return formatMessagePage(
		applyMutationPermissions(messages, viewerUserId, 'friend'),
		viewerUserId,
		RECENT_PAGE_SIZE,
	);
}

/**
 * List recent messages for an openable room conversation.
 *
 * @param {string} conversationId
 * @param {string} viewerUserId
 * @returns {Promise<object>}
 */
export async function listRoomMessages(conversationId, viewerUserId) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (!conversation) {
		return emptyMessagePage();
	}

	const messages = await ChatMessagesModel.findRecentConversationMessages(
		conversation.conversation_id,
		RECENT_PAGE_SIZE + 1,
		viewerUserId,
	);

	return formatMessagePage(
		applyMutationPermissions(messages, viewerUserId, 'room'),
		viewerUserId,
		RECENT_PAGE_SIZE,
	);
}

/**
 * List older messages for an openable friend conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.viewerUserId
 * @param {string} params.beforeId
 * @returns {Promise<object|null>}
 */
export async function listOlderFriendMessages({
	conversationId,
	viewerUserId,
	beforeId,
}) {
	const conversation = await findReadableChatConversation({
		conversationId,
		userId: viewerUserId,
	});

	if (!conversation) {
		return null;
	}

	const messages = await ChatMessagesModel.findOlderConversationMessages({
		conversationId: conversation.conversation_id,
		beforeId,
		limit: OLDER_PAGE_SIZE + 1,
		viewerUserId,
	});

	return formatMessagePage(
		applyMutationPermissions(messages, viewerUserId, 'friend'),
		viewerUserId,
		OLDER_PAGE_SIZE,
	);
}

/**
 * List older messages for an openable room conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.viewerUserId
 * @param {string} params.beforeId
 * @returns {Promise<object|null>}
 */
export async function listOlderRoomMessages({
	conversationId,
	viewerUserId,
	beforeId,
}) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (!conversation) {
		return null;
	}

	const messages = await ChatMessagesModel.findOlderConversationMessages({
		conversationId: conversation.conversation_id,
		beforeId,
		limit: OLDER_PAGE_SIZE + 1,
		viewerUserId,
	});

	return formatMessagePage(
		applyMutationPermissions(messages, viewerUserId, 'room'),
		viewerUserId,
		OLDER_PAGE_SIZE,
	);
}

/**
 * Check whether a room message can be opened by one user.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.viewerUserId
 * @returns {Promise<object|null>}
 */
export async function findOpenableRoomMessageContext({
	conversationId,
	messageId,
	viewerUserId,
}) {
	const conversation = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (!conversation) {
		return null;
	}

	return ChatMessagesModel.findConversationMessageById({
		conversationId: conversation.conversation_id,
		messageId,
	});
}

export const MESSAGE_BODY_MAX_LENGTH = BODY_MAX_LENGTH;
export const MESSAGE_PAGE_LIMIT = OLDER_PAGE_SIZE;
export const RECENT_MESSAGE_LIMIT = RECENT_PAGE_SIZE;

export default {
	createFriendMessage,
	createRoomMessage,
	deleteOwnMessage,
	editOwnMessage,
	flagRoomMessage,
	findOpenableFriendConversation,
	listOlderFriendMessages,
	listOlderRoomMessages,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listRoomMessages,
};
