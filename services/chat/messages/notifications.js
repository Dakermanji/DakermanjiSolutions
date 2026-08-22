//! services/chat/messages/notifications.js

import logger from '../../../config/logger.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from '../../../constants/notifications.js';
import { createNotification } from '../../notifications/appNotifications.js';
import { getChatRoomOpenUrl } from '../../notifications/links.js';

function getMessagePreview(body) {
	const preview = String(body || '').replace(/\s+/g, ' ').trim();
	return preview.length > 120 ? `${preview.slice(0, 119)}...` : preview;
}

function getMentionRecipientIds(message, senderUserId) {
	return [...new Set(
		(message?.mentions || [])
			.map((mention) => mention.userId)
			.filter((userId) => userId && userId !== senderUserId),
	)];
}

function getMentionLinkUrl({ kind, conversationId }) {
	return kind === 'room' ? getChatRoomOpenUrl(conversationId) : '/chat';
}

/**
 * Notify mentioned users after a message is stored.
 *
 * @param {object} input
 * @param {object} input.message
 * @param {string} input.senderUserId
 * @param {'friend'|'room'} input.kind
 * @returns {Promise<void>}
 */
export async function notifyMessageMentions({
	message,
	senderUserId,
	kind,
}) {
	const recipientUserIds = getMentionRecipientIds(message, senderUserId);
	if (recipientUserIds.length === 0) return;

	const results = await Promise.allSettled(
		recipientUserIds.map((recipientUserId) =>
			createNotification({
				recipientUserId,
				actorUserId: senderUserId,
				appKey: NOTIFICATION_APP_KEYS.CHAT,
				type: NOTIFICATION_TYPES.CHAT_MESSAGE_MENTION,
				entityType: NOTIFICATION_ENTITY_TYPES.CHAT_MESSAGE_MENTION,
				entityId: message.id,
				titleKey: 'notifications:types.chatMessageMention.title',
				bodyKey: 'notifications:types.chatMessageMention.body',
				linkUrl: getMentionLinkUrl({
					kind,
					conversationId: message.conversationId,
				}),
				data: {
					conversationId: message.conversationId,
					messageId: message.id,
					messagePreview: getMessagePreview(message.body),
					senderName: message.sender?.displayName || '',
				},
				priority: NOTIFICATION_PRIORITIES.NORMAL,
			}),
		),
	);

	const failedCount = results.filter((result) => result.status === 'rejected').length;
	if (failedCount > 0) {
		logger.warning('Chat mention notification creation failed', {
			type: 'chat',
			messageId: message.id,
			failedCount,
		});
	}
}
