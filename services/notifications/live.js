//! services/notifications/live.js

import AppNotificationsModel from '../../models/notifications/AppNotifications.js';
import logger from '../../config/logger.js';

let notificationSocketServer = null;

export function getNotificationUserRoom(userId) {
	return `notifications:user:${userId}`;
}

/**
 * Register the Socket.IO server used for notification events.
 *
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
export function setNotificationSocketServer(io) {
	notificationSocketServer = io;
}

async function emitNotificationUnreadState(socket, userId) {
	const summary = await AppNotificationsModel.findUnreadSummaryByRecipient(userId);
	socket.emit('notifications:unread:changed', summary);
}

export function registerNotificationSocketHandlers(socket) {
	const userId = socket.data?.userId;
	if (!userId) return;

	socket.on('notifications:unread:request', async () => {
		try {
			await emitNotificationUnreadState(socket, userId);
		} catch (error) {
			logger.warning('Notification unread synchronization failed', {
				type: 'notifications',
				userId,
				error,
			});
		}
	});
}

/**
 * Emit fresh unread notification counts to selected users.
 *
 * @param {Array<string | null | undefined>} userIds
 * @returns {Promise<void>}
 */
export async function emitNotificationUnreadCountsChanged(userIds) {
	if (!notificationSocketServer) return;

	for (const userId of new Set(userIds.filter(Boolean))) {
		const summary =
			await AppNotificationsModel.findUnreadSummaryByRecipient(userId);

		notificationSocketServer
			.to(getNotificationUserRoom(userId))
			.emit('notifications:unread:changed', summary);
	}
}

export default {
	emitNotificationUnreadCountsChanged,
	getNotificationUserRoom,
	registerNotificationSocketHandlers,
	setNotificationSocketServer,
};
