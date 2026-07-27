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

export function getNotificationLinkUrl(notification) {
	if (
		notification.type === NOTIFICATION_TYPES.CHAT_ROOM_JOIN_REQUEST_APPROVED
	) {
		return getChatRoomOpenUrl(notification.data?.conversationId);
	}

	return notification.link_url || notification.linkUrl || '/notifications';
}
