//! services/notifications/links.js

import { NOTIFICATION_TYPES } from '../../constants/notifications.js';
import { isValidUuid } from '../../middlewares/validators/common.js';

export function getChatRoomOpenUrl(conversationId) {
	const normalizedConversationId = String(conversationId || '').trim();

	if (!isValidUuid(normalizedConversationId)) {
		return '/chat';
	}

	return `/chat/rooms/open/${normalizedConversationId}`;
}

export function getChatMessageOpenUrl(conversationId, messageId) {
	const normalizedConversationId = String(conversationId || '').trim();
	const normalizedMessageId = String(messageId || '').trim();

	if (
		!isValidUuid(normalizedConversationId) ||
		!isValidUuid(normalizedMessageId)
	) {
		return '/chat';
	}

	return `/chat/messages/open/${normalizedConversationId}/${normalizedMessageId}`;
}

function getSafeInternalNotificationUrl(value) {
	const normalizedValue = String(value || '').trim();

	if (
		!normalizedValue.startsWith('/')
		|| normalizedValue.startsWith('//')
		|| normalizedValue.startsWith('/\\')
		|| /[\u0000-\u001F\u007F]/.test(normalizedValue)
	) {
		return '/notifications';
	}

	return normalizedValue;
}

export function getNotificationLinkUrl(notification) {
	if (
		notification.type === NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST_APPROVED ||
		notification.type === NOTIFICATION_TYPES.CHAT_ROOM_MEMBER_PROMOTED
	) {
		return getChatRoomOpenUrl(notification.data?.conversationId);
	}

	return getSafeInternalNotificationUrl(
		notification.link_url || notification.linkUrl,
	);
}
