//! models/notifications/appNotifications/state.js

import { query, queryRows } from '../../../config/database.js';

export async function markAsRead(notificationId, recipientUserId) {
	const q = `UPDATE app_notifications SET read_at = COALESCE(read_at, NOW()), updated_at = NOW()
		WHERE id = $1 AND recipient_user_id = $2 AND read_at IS NULL;`;
	const result = await query(q, [notificationId, recipientUserId]);
	return result.rowCount > 0;
}

export async function markManyAsRead(notificationIds, recipientUserId) {
	if (!Array.isArray(notificationIds) || notificationIds.length === 0) return 0;
	const q = `UPDATE app_notifications SET read_at = COALESCE(read_at, NOW()), updated_at = NOW()
		WHERE recipient_user_id = $1 AND id = ANY($2::uuid[])
			AND read_at IS NULL AND dismissed_at IS NULL;`;
	const result = await query(q, [recipientUserId, notificationIds]);
	return result.rowCount;
}

export async function dismiss(notificationId, recipientUserId) {
	const q = `UPDATE app_notifications SET
			read_at = COALESCE(read_at, NOW()),
			dismissed_at = COALESCE(dismissed_at, NOW()), updated_at = NOW()
		WHERE id = $1 AND recipient_user_id = $2 AND dismissed_at IS NULL;`;
	const result = await query(q, [notificationId, recipientUserId]);
	return result.rowCount > 0;
}

export async function dismissByEntityTypes(entityTypes, entityId) {
	if (!Array.isArray(entityTypes) || entityTypes.length === 0 || !entityId) {
		return [];
	}
	const q = `UPDATE app_notifications SET
			read_at = COALESCE(read_at, NOW()),
			dismissed_at = COALESCE(dismissed_at, NOW()), updated_at = NOW()
		WHERE entity_type = ANY($1::varchar(80)[]) AND entity_id = $2::uuid
			AND dismissed_at IS NULL RETURNING recipient_user_id;`;
	const rows = await queryRows(q, [entityTypes, entityId]);
	return rows.map((row) => row.recipient_user_id);
}

export async function respond(notificationId, recipientUserId, responseKey) {
	const q = `UPDATE app_notifications SET
			read_at = COALESCE(read_at, NOW()),
			responded_at = COALESCE(responded_at, NOW()),
			response_key = COALESCE(response_key, $3), updated_at = NOW()
		WHERE id = $1 AND recipient_user_id = $2 AND responded_at IS NULL;`;
	const result = await query(q, [notificationId, recipientUserId, responseKey]);
	return result.rowCount > 0;
}

export async function respondAndDismissByEntity({
	entityType,
	entityId,
	responseKey,
}) {
	const q = `UPDATE app_notifications SET
			read_at = COALESCE(read_at, NOW()),
			dismissed_at = COALESCE(dismissed_at, NOW()),
			responded_at = COALESCE(responded_at, NOW()),
			response_key = COALESCE(response_key, $3::varchar(40)), updated_at = NOW()
		WHERE entity_type = $1::varchar(80) AND entity_id = $2::uuid
			AND responded_at IS NULL RETURNING recipient_user_id;`;
	const rows = await queryRows(q, [entityType, entityId, responseKey]);
	return rows.map((row) => row.recipient_user_id);
}
