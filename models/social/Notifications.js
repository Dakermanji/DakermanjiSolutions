//! models/social/Notifications.js

import { query, queryRows } from '../../config/database.js';

const BASE_FIELDS = [
	'id',
	'recipient_id',
	'actor_id',
	'type',
	'follow_request_id',
	'is_read',
	'read_at',
	'is_handled',
	'handled_at',
	'created_at',
	'updated_at',
];

const baseFieldsSQL = BASE_FIELDS.join(', ');

const baseFieldsWithAlias = (alias) =>
	BASE_FIELDS.map((f) => `${alias}.${f}`).join(', ');

/**
 * Create a social notification.
 *
 * @param {{
 *   recipientId: string,
 *   actorId: string,
 *   type: string,
 *   followRequestId?: string | null
 * }} params
 * @returns {Promise}
 */
export async function create({
	recipientId,
	actorId,
	type,
	followRequestId = null,
}) {
	const q = `
		INSERT INTO user_social_notifications (
			recipient_id,
			actor_id,
			type,
			follow_request_id
		)
		VALUES ($1, $2, $3, $4)
		RETURNING ${baseFieldsSQL}
	`;

	const rows = await queryRows(q, [
		recipientId,
		actorId,
		type,
		followRequestId,
	]);

	return rows[0] || null;
}

/**
 * Ensure a pending follow request has a visible notification.
 *
 * @param {{
 *   recipientId: string,
 *   actorId: string,
 *   followRequestId: string
 * }} params
 * @returns {Promise}
 */
export async function ensureFollowRequestNotification({
	recipientId,
	actorId,
	followRequestId,
}) {
	const restoreQ = `
		UPDATE user_social_notifications
		SET
			is_read = FALSE,
			read_at = NULL,
			is_handled = FALSE,
			handled_at = NULL,
			updated_at = NOW()
		WHERE recipient_id = $1
			AND actor_id = $2
			AND follow_request_id = $3
			AND type = 'follow_request'
			AND is_handled = TRUE
		RETURNING ${baseFieldsSQL};
	`;

	const restoredRows = await queryRows(restoreQ, [
		recipientId,
		actorId,
		followRequestId,
	]);

	if (restoredRows[0]) return restoredRows[0];

	const existingQ = `
		SELECT ${baseFieldsSQL}
		FROM user_social_notifications
		WHERE recipient_id = $1
			AND actor_id = $2
			AND follow_request_id = $3
			AND type = 'follow_request'
			AND is_handled = FALSE
		ORDER BY created_at DESC
		LIMIT 1;
	`;

	const existingRows = await queryRows(existingQ, [
		recipientId,
		actorId,
		followRequestId,
	]);

	if (existingRows[0]) return existingRows[0];

	return create({
		recipientId,
		actorId,
		type: 'follow_request',
		followRequestId,
	});
}

/**
 * Find notifications for one recipient.
 *
 * Responsibilities:
 * - return only notifications belonging to the recipient
 * - include actor data needed for rendering
 * - include follow request status when available
 * - sort newest first
 *
 * @param {string} recipientId
 * @param {number} [limit=20]
 * @param {number} [offset=0]
 * @returns {Promise<Array>}
 */
export async function findByRecipient(recipientId, limit = 20, offset = 0) {
	const q = `
		SELECT
			${baseFieldsWithAlias('usn')},
			u.username AS actor_username,
			u.email AS actor_email,
			ufr.requester_id,
			ufr.target_id,
			ufr.status AS follow_request_status
		FROM user_social_notifications usn
		INNER JOIN users u
			ON u.id = usn.actor_id
		LEFT JOIN user_follow_requests ufr
			ON ufr.id = usn.follow_request_id
		WHERE usn.recipient_id = $1
			AND usn.is_handled = FALSE
		ORDER BY usn.created_at DESC
		LIMIT $2 OFFSET $3;
	`;

	return queryRows(q, [recipientId, limit, offset]);
}

/**
 * Count unhandled notifications for one recipient.
 *
 * @param {string} recipientId
 * @returns {Promise<number>}
 */
export async function countUnhandledByRecipient(recipientId) {
	const q = `
		SELECT COUNT(*)::int AS count
		FROM user_social_notifications
		WHERE recipient_id = $1
			AND is_handled = FALSE;
	`;

	const rows = await queryRows(q, [recipientId]);
	return rows[0]?.count || 0;
}

/**
 * Find one actionable notification for its recipient.
 *
 * Responsibilities:
 * - ensure ownership by recipient
 * - ensure the notification is still actionable
 * - include related follow request data
 *
 * @param {string} notificationId
 * @param {string} recipientId
 * @returns {Promise}
 */
export async function findActionableByIdForRecipient(
	notificationId,
	recipientId,
) {
	const q = `
		SELECT
			${baseFieldsWithAlias('usn')},
			u.username AS actor_username,
			u.email AS actor_email,
			ufr.requester_id,
			ufr.target_id,
			ufr.status AS follow_request_status
		FROM user_social_notifications usn
		INNER JOIN users u
			ON u.id = usn.actor_id
		LEFT JOIN user_follow_requests ufr
			ON ufr.id = usn.follow_request_id
		WHERE usn.id = $1
			AND usn.recipient_id = $2
			AND usn.is_handled = FALSE
			AND (
				(usn.type = 'follow_request' AND ufr.status = 'pending')
				OR usn.type = 'follow_started'
				OR usn.type = 'follow_request_accepted'
				OR usn.type = 'follow_request_accepted_followed_back'
			)
		LIMIT 1;
	`;

	const rows = await queryRows(q, [notificationId, recipientId]);
	return rows[0] || null;
}

/**
 * Mark one notification as read for its recipient.
 *
 * @param {string} notificationId
 * @param {string} recipientId
 * @returns {Promise<boolean>}
 */
export async function markAsRead(notificationId, recipientId) {
	const q = `
		UPDATE user_social_notifications
		SET
			is_read = TRUE,
			read_at = COALESCE(read_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
			AND recipient_id = $2
			AND is_read = FALSE;
	`;

	const result = await query(q, [notificationId, recipientId]);
	return result.rowCount > 0;
}

/**
 * Mark one notification as handled for its recipient.
 *
 * @param {string} notificationId
 * @param {string} recipientId
 * @returns {Promise<boolean>}
 */
export async function markAsHandled(notificationId, recipientId) {
	const q = `
		UPDATE user_social_notifications
		SET
			is_handled = TRUE,
			handled_at = COALESCE(handled_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
			AND recipient_id = $2
			AND is_handled = FALSE;
	`;

	const result = await query(q, [notificationId, recipientId]);
	return result.rowCount > 0;
}

/**
 * Mark one notification as read and handled for its recipient.
 *
 * @param {string} notificationId
 * @param {string} recipientId
 * @returns {Promise<boolean>}
 */
export async function markAsReadAndHandled(notificationId, recipientId) {
	const q = `
		UPDATE user_social_notifications
		SET
			is_read = TRUE,
			read_at = COALESCE(read_at, NOW()),
			is_handled = TRUE,
			handled_at = COALESCE(handled_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
			AND recipient_id = $2
			AND is_handled = FALSE;
	`;

	const result = await query(q, [notificationId, recipientId]);
	return result.rowCount > 0;
}

/**
 * Mark follow-request notifications as read and handled for one recipient.
 *
 * @param {string} followRequestId
 * @param {string} recipientId
 * @returns {Promise<boolean>}
 */
export async function markFollowRequestNotificationsAsReadAndHandled(
	followRequestId,
	recipientId,
) {
	const q = `
		UPDATE user_social_notifications
		SET
			is_read = TRUE,
			read_at = COALESCE(read_at, NOW()),
			is_handled = TRUE,
			handled_at = COALESCE(handled_at, NOW()),
			updated_at = NOW()
		WHERE follow_request_id = $1
			AND recipient_id = $2
			AND type = 'follow_request'
			AND is_handled = FALSE;
	`;

	const result = await query(q, [followRequestId, recipientId]);
	return result.rowCount > 0;
}

export default {
	create,
	ensureFollowRequestNotification,
	findByRecipient,
	countUnhandledByRecipient,
	findActionableByIdForRecipient,
	markAsRead,
	markAsHandled,
	markAsReadAndHandled,
	markFollowRequestNotificationsAsReadAndHandled,
};
