//! controllers/social/actionContext.js

import UserSocialNotificationsModel from '../../models/social/Notifications.js';

/**
 * Build normalized context for one social action.
 *
 * @param {{
 *   actorId: string,
 *   action: string,
 *   targetUserId: string | null,
 *   followRequestId: string | null,
 *   notificationId: string | null
 * }} params
 * @returns {Promise<object>}
 */
export async function buildActionContext({
	actorId,
	action,
	targetUserId,
	followRequestId,
	notificationId,
}) {
	const notification = notificationId
		? await requireNotificationOwnership(notificationId, actorId)
		: null;

	return {
		actorId,
		action,
		targetUserId,
		followRequestId,
		notificationId,
		notification,
	};
}

export function getTargetUserId(context) {
	const { notification, targetUserId } = context;

	if (!notification) return targetUserId;
	if (notification.type === 'follow_request') return notification.requester_id;

	return notification.actor_id;
}

export function getFollowRequestActorId(context) {
	return context.notification?.requester_id || context.targetUserId;
}

export function getFollowRequestId(context) {
	return context.notification?.follow_request_id || context.followRequestId;
}

export function getPendingNotificationFollowRequestId(context) {
	if (context.notification?.type !== 'follow_request') {
		return context.followRequestId;
	}

	return context.notification.follow_request_id;
}

export function requireNotificationContext(context) {
	if (!context.notification) {
		throw new Error('notificationId is required for this social action');
	}
}

export function requireTargetUserId(targetUserId) {
	if (!targetUserId) {
		throw new Error('targetUserId is required for this social action');
	}
}

export function requireFollowRequestId(followRequestId) {
	if (!followRequestId) {
		throw new Error('followRequestId is required for this social action');
	}
}

async function requireNotificationOwnership(notificationId, recipientId) {
	if (!notificationId) {
		throw new Error('notificationId is required for this social action');
	}

	const notification =
		await UserSocialNotificationsModel.findActionableByIdForRecipient(
			notificationId,
			recipientId,
		);

	if (!notification) {
		const error = new Error(
			'Notification was not found or is no longer actionable',
		);
		error.code = 'STALE_SOCIAL_ACTION';
		throw error;
	}

	return notification;
}
