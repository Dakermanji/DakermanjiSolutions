//! services/notifications/appNotifications.js

import AppNotificationsModel from '../../models/notifications/AppNotifications.js';
import { NOTIFICATION_LIMITS } from '../../constants/notifications.js';
import { validateCreateNotificationInput } from '../../middlewares/validators/notifications.js';
import { emitNotificationUnreadCountsChanged } from './live.js';

function normalizeRequiredText(value) {
	return String(value ?? '').normalize('NFKC').trim();
}

function truncateText(value, maxLength) {
	if (!value) return value;
	return value.slice(0, maxLength);
}

function normalizePositiveInteger(value, fallback) {
	const normalizedValue = Number(value);

	if (!Number.isInteger(normalizedValue) || normalizedValue < 0) {
		return fallback;
	}

	return normalizedValue;
}

/**
 * Create one app notification.
 *
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createNotification(input) {
	const validation = validateCreateNotificationInput(input);

	if (!validation.isValid) {
		return {
			errors: validation.errors,
			notification: null,
		};
	}

	const notification = await AppNotificationsModel.create(validation.values);
	if (notification) {
		await emitNotificationUnreadCountsChanged([notification.recipient_user_id]);
	}

	return {
		errors: {},
		notification,
	};
}

/**
 * Create one app notification unless an unresolved matching one already exists.
 *
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createNotificationIfNotExists(input) {
	const validation = validateCreateNotificationInput(input);

	if (!validation.isValid) {
		return {
			errors: validation.errors,
			notification: null,
		};
	}

	const notification = await AppNotificationsModel.createIfNotExists(
		validation.values,
	);
	if (notification) {
		await emitNotificationUnreadCountsChanged([notification.recipient_user_id]);
	}

	return {
		errors: {},
		notification,
	};
}

/**
 * List visible notifications for one user.
 *
 * @param {string} recipientUserId
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export function listNotifications(recipientUserId, options = {}) {
	const limit = normalizePositiveInteger(
		options.limit,
		NOTIFICATION_LIMITS.PAGE_SIZE,
	);
	const offset = normalizePositiveInteger(options.offset, 0);

	return AppNotificationsModel.findByRecipient(recipientUserId, {
		limit,
		offset,
	});
}

/**
 * Count unread visible notifications for one user.
 *
 * @param {string} recipientUserId
 * @returns {Promise<number>}
 */
export function countUnreadNotifications(recipientUserId) {
	return AppNotificationsModel.countUnreadByRecipient(recipientUserId);
}

/**
 * Mark one notification as read.
 *
 * @param {string} notificationId
 * @param {string} recipientUserId
 * @returns {Promise<boolean>}
 */
export async function markNotificationRead(notificationId, recipientUserId) {
	const isUpdated = await AppNotificationsModel.markAsRead(
		notificationId,
		recipientUserId,
	);

	if (isUpdated) {
		await emitNotificationUnreadCountsChanged([recipientUserId]);
	}

	return isUpdated;
}

/**
 * Mark many notifications as read.
 *
 * @param {Array<string>} notificationIds
 * @param {string} recipientUserId
 * @returns {Promise<number>}
 */
export async function markNotificationsRead(notificationIds, recipientUserId) {
	const updatedCount = await AppNotificationsModel.markManyAsRead(
		notificationIds,
		recipientUserId,
	);

	if (updatedCount > 0) {
		await emitNotificationUnreadCountsChanged([recipientUserId]);
	}

	return updatedCount;
}

/**
 * Dismiss one notification.
 *
 * @param {string} notificationId
 * @param {string} recipientUserId
 * @returns {Promise<boolean>}
 */
export async function dismissNotification(notificationId, recipientUserId) {
	const isUpdated = await AppNotificationsModel.dismiss(
		notificationId,
		recipientUserId,
	);

	if (isUpdated) {
		await emitNotificationUnreadCountsChanged([recipientUserId]);
	}

	return isUpdated;
}

/**
 * Respond to one actionable notification.
 *
 * @param {string} notificationId
 * @param {string} recipientUserId
 * @param {string} responseKey
 * @returns {Promise<boolean>}
 */
export async function respondToNotification(
	notificationId,
	recipientUserId,
	responseKey,
) {
	const normalizedResponseKey = truncateText(
		normalizeRequiredText(responseKey),
		NOTIFICATION_LIMITS.RESPONSE_KEY_MAX_LENGTH,
	);

	if (!normalizedResponseKey) {
		return false;
	}

	const isUpdated = await AppNotificationsModel.respond(
		notificationId,
		recipientUserId,
		normalizedResponseKey,
	);

	if (isUpdated) {
		await emitNotificationUnreadCountsChanged([recipientUserId]);
	}

	return isUpdated;
}

/**
 * Respond and dismiss unresolved notifications linked to one entity.
 *
 * @param {object} input
 * @param {string} input.entityType
 * @param {string} input.entityId
 * @param {string} input.responseKey
 * @returns {Promise<number|boolean>}
 */
export async function respondAndDismissNotificationsByEntity({
	entityType,
	entityId,
	responseKey,
}) {
	const normalizedEntityType = truncateText(
		normalizeRequiredText(entityType),
		NOTIFICATION_LIMITS.ENTITY_TYPE_MAX_LENGTH,
	);
	const normalizedEntityId = normalizeRequiredText(entityId);
	const normalizedResponseKey = truncateText(
		normalizeRequiredText(responseKey),
		NOTIFICATION_LIMITS.RESPONSE_KEY_MAX_LENGTH,
	);

	if (!normalizedEntityType || !normalizedEntityId || !normalizedResponseKey) {
		return false;
	}

	const recipientUserIds = await AppNotificationsModel.respondAndDismissByEntity({
		entityType: normalizedEntityType,
		entityId: normalizedEntityId,
		responseKey: normalizedResponseKey,
	});

	if (recipientUserIds.length > 0) {
		await emitNotificationUnreadCountsChanged(recipientUserIds);
	}

	return recipientUserIds.length;
}

export default {
	countUnreadNotifications,
	createNotificationIfNotExists,
	createNotification,
	dismissNotification,
	listNotifications,
	markNotificationRead,
	markNotificationsRead,
	respondAndDismissNotificationsByEntity,
	respondToNotification,
	validateCreateNotificationInput,
};
