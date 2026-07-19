//! models/notifications/AppNotifications.js

import { query, queryRows } from '../../config/database.js';
import { NOTIFICATION_LIMITS } from '../../constants/notifications.js';

const BASE_FIELDS = [
	'id',
	'recipient_user_id',
	'actor_user_id',
	'app_key',
	'type',
	'entity_type',
	'entity_id',
	'title_key',
	'body_key',
	'link_url',
	'data',
	'priority',
	'read_at',
	'dismissed_at',
	'responded_at',
	'response_key',
	'expires_at',
	'created_at',
	'updated_at',
];

const baseFieldsSQL = BASE_FIELDS.join(', ');

const baseFieldsWithAlias = (alias) =>
	BASE_FIELDS.map((field) => `${alias}.${field}`).join(', ');

/**
 * Create one app notification.
 *
 * @param {object} notification
 * @param {string} notification.recipientUserId
 * @param {string|null} [notification.actorUserId]
 * @param {string} notification.appKey
 * @param {string} notification.type
 * @param {string|null} [notification.entityType]
 * @param {string|null} [notification.entityId]
 * @param {string|null} [notification.titleKey]
 * @param {string|null} [notification.bodyKey]
 * @param {string|null} [notification.linkUrl]
 * @param {object} [notification.data]
 * @param {string} [notification.priority]
 * @param {Date|string|null} [notification.expiresAt]
 * @returns {Promise<object|null>}
 */
export async function create({
	recipientUserId,
	actorUserId = null,
	appKey,
	type,
	entityType = null,
	entityId = null,
	titleKey = null,
	bodyKey = null,
	linkUrl = null,
	data = {},
	priority = 'normal',
	expiresAt = null,
}) {
	const q = `
		INSERT INTO app_notifications (
			recipient_user_id,
			actor_user_id,
			app_key,
			type,
			entity_type,
			entity_id,
			title_key,
			body_key,
			link_url,
			data,
			priority,
			expires_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING ${baseFieldsSQL};
	`;

	const rows = await queryRows(q, [
		recipientUserId,
		actorUserId,
		appKey,
		type,
		entityType,
		entityId,
		titleKey,
		bodyKey,
		linkUrl,
		data,
		priority,
		expiresAt,
	]);

	return rows[0] || null;
}

/**
 * Find visible notifications for one recipient.
 *
 * Dismissed notifications are hidden from the default inbox.
 *
 * @param {string} recipientUserId
 * @param {object} [options]
 * @param {number} [options.limit]
 * @param {number} [options.offset]
 * @returns {Promise<Array>}
 */
export function findByRecipient(
	recipientUserId,
	{ limit = NOTIFICATION_LIMITS.PAGE_SIZE, offset = 0 } = {},
) {
	const q = `
		SELECT
			${baseFieldsWithAlias('an')},
			actor.username AS actor_username,
			actor.email AS actor_email
		FROM app_notifications an
		LEFT JOIN users actor
			ON actor.id = an.actor_user_id
		WHERE an.recipient_user_id = $1
			AND an.dismissed_at IS NULL
			AND (
				an.expires_at IS NULL
				OR an.expires_at > NOW()
			)
		ORDER BY an.created_at DESC
		LIMIT $2 OFFSET $3;
	`;

	return queryRows(q, [recipientUserId, limit, offset]);
}

/**
 * Count unread visible notifications for one recipient.
 *
 * @param {string} recipientUserId
 * @returns {Promise<number>}
 */
export async function countUnreadByRecipient(recipientUserId) {
	const q = `
		SELECT COUNT(*)::int AS count
		FROM app_notifications
		WHERE recipient_user_id = $1
			AND read_at IS NULL
			AND dismissed_at IS NULL
			AND (
				expires_at IS NULL
				OR expires_at > NOW()
			);
	`;

	const rows = await queryRows(q, [recipientUserId]);
	return rows[0]?.count || 0;
}

/**
 * Find one notification owned by a recipient.
 *
 * @param {string} notificationId
 * @param {string} recipientUserId
 * @returns {Promise<object|null>}
 */
export async function findByIdForRecipient(notificationId, recipientUserId) {
	const q = `
		SELECT ${baseFieldsSQL}
		FROM app_notifications
		WHERE id = $1
			AND recipient_user_id = $2
		LIMIT 1;
	`;

	const rows = await queryRows(q, [notificationId, recipientUserId]);
	return rows[0] || null;
}

/**
 * Mark one notification as read for its recipient.
 *
 * @param {string} notificationId
 * @param {string} recipientUserId
 * @returns {Promise<boolean>}
 */
export async function markAsRead(notificationId, recipientUserId) {
	const q = `
		UPDATE app_notifications
		SET
			read_at = COALESCE(read_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
			AND recipient_user_id = $2
			AND read_at IS NULL;
	`;

	const result = await query(q, [notificationId, recipientUserId]);
	return result.rowCount > 0;
}

/**
 * Dismiss one notification for its recipient.
 *
 * @param {string} notificationId
 * @param {string} recipientUserId
 * @returns {Promise<boolean>}
 */
export async function dismiss(notificationId, recipientUserId) {
	const q = `
		UPDATE app_notifications
		SET
			read_at = COALESCE(read_at, NOW()),
			dismissed_at = COALESCE(dismissed_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
			AND recipient_user_id = $2
			AND dismissed_at IS NULL;
	`;

	const result = await query(q, [notificationId, recipientUserId]);
	return result.rowCount > 0;
}

/**
 * Record a response to one actionable notification.
 *
 * @param {string} notificationId
 * @param {string} recipientUserId
 * @param {string} responseKey
 * @returns {Promise<boolean>}
 */
export async function respond(notificationId, recipientUserId, responseKey) {
	const q = `
		UPDATE app_notifications
		SET
			read_at = COALESCE(read_at, NOW()),
			responded_at = COALESCE(responded_at, NOW()),
			response_key = COALESCE(response_key, $3),
			updated_at = NOW()
		WHERE id = $1
			AND recipient_user_id = $2
			AND responded_at IS NULL;
	`;

	const result = await query(q, [
		notificationId,
		recipientUserId,
		responseKey,
	]);
	return result.rowCount > 0;
}

export default {
	countUnreadByRecipient,
	create,
	dismiss,
	findByIdForRecipient,
	findByRecipient,
	markAsRead,
	respond,
};
