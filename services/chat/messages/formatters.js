//! services/chat/messages/formatters.js

import { getUserAvatarProfile } from '../../avatar/dicebear.js';

const REPLY_PREVIEW_MAX_LENGTH = 120;

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

export function formatMessage(message, viewerUserId) {
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

export function formatLiveMessage(message) {
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
