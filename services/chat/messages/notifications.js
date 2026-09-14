//! services/chat/messages/notifications.js

import logger from '../../../config/logger.js';
import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
} from '../../../constants/notifications.js';
import {
	createNotificationIfNotExists,
	dismissNotificationsByEntityTypes,
} from '../../notifications/appNotifications.js';
import { getChatMessageOpenUrl } from '../../notifications/links.js';

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

export function dismissMessageNotifications(messageId) {
	return dismissNotificationsByEntityTypes([
		NOTIFICATION_ENTITY_TYPES.CHAT_MESSAGE_MENTION,
		NOTIFICATION_ENTITY_TYPES.CHAT_MESSAGE_REPLY,
		NOTIFICATION_ENTITY_TYPES.CHAT_MESSAGE_MODERATION,
	], messageId);
}

/**
 * Notify mentioned users after a message is stored.
 *
 * @param {object} input
 * @param {object} input.message
 * @param {string} input.senderUserId
 * @returns {Promise<void>}
 */
export async function notifyMessageMentions({
	message,
	senderUserId,
}) {
	const recipientUserIds = getMentionRecipientIds(message, senderUserId);
	if (recipientUserIds.length === 0) return;

	const results = await Promise.allSettled(
		recipientUserIds.map((recipientUserId) =>
			createNotificationIfNotExists({
				recipientUserId,
				actorUserId: senderUserId,
				appKey: NOTIFICATION_APP_KEYS.CHAT,
				type: NOTIFICATION_TYPES.CHAT_MESSAGE_MENTION,
				entityType: NOTIFICATION_ENTITY_TYPES.CHAT_MESSAGE_MENTION,
				entityId: message.id,
				titleKey: 'notifications:types.chatMessageMention.title',
				bodyKey: 'notifications:types.chatMessageMention.body',
				linkUrl: getChatMessageOpenUrl(
					message.conversationId,
					message.id,
				),
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

/**
 * Notify the replied-to author unless the message already mentioned them.
 *
 * @param {object} input
 * @param {object} input.message
 * @param {string} input.senderUserId
 * @returns {Promise<void>}
 */
export async function notifyMessageReply({ message, senderUserId }) {
	const recipientUserId = message?.replyTo?.sender?.id || null;
	const mentionRecipientIds = new Set(
		getMentionRecipientIds(message, senderUserId),
	);

	if (
		!recipientUserId ||
		recipientUserId === senderUserId ||
		mentionRecipientIds.has(recipientUserId)
	) {
		return;
	}

	try {
		await createNotificationIfNotExists({
			recipientUserId,
			actorUserId: senderUserId,
			appKey: NOTIFICATION_APP_KEYS.CHAT,
			type: NOTIFICATION_TYPES.CHAT_MESSAGE_REPLY,
			entityType: NOTIFICATION_ENTITY_TYPES.CHAT_MESSAGE_REPLY,
			entityId: message.id,
			titleKey: 'notifications:types.chatMessageReply.title',
			bodyKey: 'notifications:types.chatMessageReply.body',
			linkUrl: getChatMessageOpenUrl(
				message.conversationId,
				message.id,
			),
			data: {
				conversationId: message.conversationId,
				messageId: message.id,
				messagePreview: getMessagePreview(message.body),
				replyToMessageId: message.replyTo.id,
				senderName: message.sender?.displayName || '',
			},
			priority: NOTIFICATION_PRIORITIES.NORMAL,
		});
	} catch (error) {
		logger.warning('Chat reply notification creation failed', {
			type: 'chat',
			messageId: message.id,
			error,
		});
	}
}
