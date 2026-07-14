//! controllers/social/notifications.js

import UserSocialNotificationsModel from '../../models/social/Notifications.js';

/**
 * Return notifications for the signed-in user.
 *
 * Responsibilities:
 * - ensure the user is authenticated
 * - fetch notifications for the recipient
 * - serialize notifications for client consumption
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getNotifications(req, res, next) {
	try {
		const recipientId = req.user?.id;

		if (!recipientId) {
			res.status(401).json({
				ok: false,
				error: 'auth:error.auth_required',
			});
			return;
		}

		const notifications =
			await UserSocialNotificationsModel.findByRecipient(recipientId);

		res.json({
			ok: true,
			notifications: notifications.map(serializeNotification),
		});
	} catch (error) {
		next(error);
	}
}

/**
 * Serialize one notification for frontend usage.
 *
 * Responsibilities:
 * - expose only safe and relevant fields
 * - normalize naming for client usage
 * - attach available actions based on notification state
 *
 * @param {object} notification
 * @returns {object}
 */
function serializeNotification(notification) {
	return {
		id: notification.id,
		type: notification.type,
		actor_id: notification.actor_id,
		actor_username: notification.actor_username,
		actor_email: notification.actor_email,
		follow_request_id: notification.follow_request_id,
		follow_request_status: notification.follow_request_status,
		created_at: notification.created_at,
		actions: getNotificationActions(notification),
	};
}

/**
 * Build available actions for a notification.
 *
 * Responsibilities:
 * - determine allowed actions based on type and state
 * - include required identifiers for each action
 * - keep action logic centralized and predictable
 *
 * Notes:
 * - follow_request actions are only available when pending
 * - resolved follow notifications support limited actions (block / ignore)
 *
 * @param {object} notification
 * @returns {Array<{
 *   name: string,
 *   targetUserId?: string,
 *   followRequestId?: string,
 *   notificationId: string
 * }>}
 */
function getNotificationActions(notification) {
	// Follow request: full action set when still pending
	if (
		notification.type === 'follow_request' &&
		notification.follow_request_status === 'pending'
	) {
		return [
			{
				name: 'accept_follow_request',
				targetUserId: notification.requester_id,
				followRequestId: notification.follow_request_id,
				notificationId: notification.id,
			},
			{
				name: 'follow_back',
				targetUserId: notification.requester_id,
				followRequestId: notification.follow_request_id,
				notificationId: notification.id,
			},
			{
				name: 'reject_follow_request',
				targetUserId: notification.requester_id,
				followRequestId: notification.follow_request_id,
				notificationId: notification.id,
			},
			{
				name: 'block_user',
				targetUserId: notification.requester_id,
				followRequestId: notification.follow_request_id,
				notificationId: notification.id,
			},
			{
				name: 'ignore_notification',
				targetUserId: notification.requester_id,
				notificationId: notification.id,
			},
		];
	}

	if (
		notification.type === 'follow_started' ||
		notification.type === 'follow_request_accepted' ||
		notification.type === 'follow_request_accepted_followed_back'
	) {
		return [
			{
				name: 'block_user',
				targetUserId: notification.actor_id,
				notificationId: notification.id,
			},
			{
				name: 'ignore_notification',
				targetUserId: notification.actor_id,
				notificationId: notification.id,
			},
		];
	}

	return [];
}
