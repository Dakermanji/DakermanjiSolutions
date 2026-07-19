//! middlewares/validators/notifications.js

import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_LIMITS,
	NOTIFICATION_PRIORITIES,
} from '../../constants/notifications.js';

const VALID_APP_KEYS = new Set(Object.values(NOTIFICATION_APP_KEYS));
const VALID_PRIORITIES = new Set(Object.values(NOTIFICATION_PRIORITIES));

function normalizeNullableText(value) {
	const normalizedValue = String(value ?? '').normalize('NFKC').trim();
	return normalizedValue || null;
}

function normalizeRequiredText(value) {
	return String(value ?? '').normalize('NFKC').trim();
}

function truncateText(value, maxLength) {
	if (!value) return value;
	return value.slice(0, maxLength);
}

function normalizeNotificationData(data) {
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		return {};
	}

	return data;
}

function normalizePriority(priority) {
	const normalizedPriority = normalizeRequiredText(priority);
	return VALID_PRIORITIES.has(normalizedPriority)
		? normalizedPriority
		: NOTIFICATION_PRIORITIES.NORMAL;
}

/**
 * Normalize and validate notification creation input.
 *
 * @param {object} input
 * @returns {object}
 */
export function validateCreateNotificationInput(input = {}) {
	const values = {
		recipientUserId: normalizeRequiredText(input.recipientUserId),
		actorUserId: normalizeNullableText(input.actorUserId),
		appKey: normalizeRequiredText(input.appKey),
		type: truncateText(
			normalizeRequiredText(input.type),
			NOTIFICATION_LIMITS.TYPE_MAX_LENGTH,
		),
		entityType: truncateText(
			normalizeNullableText(input.entityType),
			NOTIFICATION_LIMITS.ENTITY_TYPE_MAX_LENGTH,
		),
		entityId: normalizeNullableText(input.entityId),
		titleKey: truncateText(
			normalizeNullableText(input.titleKey),
			NOTIFICATION_LIMITS.TITLE_KEY_MAX_LENGTH,
		),
		bodyKey: truncateText(
			normalizeNullableText(input.bodyKey),
			NOTIFICATION_LIMITS.BODY_KEY_MAX_LENGTH,
		),
		linkUrl: truncateText(
			normalizeNullableText(input.linkUrl),
			NOTIFICATION_LIMITS.LINK_URL_MAX_LENGTH,
		),
		data: normalizeNotificationData(input.data),
		priority: normalizePriority(input.priority),
		expiresAt: input.expiresAt || null,
	};
	const errors = {};

	if (!values.recipientUserId) {
		errors.recipientUserId = 'Recipient user is required.';
	}

	if (!VALID_APP_KEYS.has(values.appKey)) {
		errors.appKey = 'Notification app is invalid.';
	}

	if (!values.type) {
		errors.type = 'Notification type is required.';
	}

	return {
		errors,
		isValid: Object.keys(errors).length === 0,
		values,
	};
}
