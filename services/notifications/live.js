//! services/notifications/live.js

import AppNotificationsModel from '../../models/notifications/AppNotifications.js';

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

/**
 * Emit fresh unread notification counts to selected users.
 *
 * @param {Array<string | null | undefined>} userIds
 * @returns {Promise<void>}
 */
export async function emitNotificationUnreadCountsChanged(userIds) {
	if (!notificationSocketServer) return;

	for (const userId of new Set(userIds.filter(Boolean))) {
		const unreadCount =
			await AppNotificationsModel.countUnreadByRecipient(userId);

		notificationSocketServer
			.to(getNotificationUserRoom(userId))
			.emit('notifications:unread:changed', {
				unreadCount,
			});
	}
}

export default {
	emitNotificationUnreadCountsChanged,
	getNotificationUserRoom,
	setNotificationSocketServer,
};
