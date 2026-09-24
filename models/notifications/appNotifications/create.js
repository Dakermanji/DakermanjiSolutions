//! models/notifications/appNotifications/create.js

import { randomUUID } from 'node:crypto';
import pool, { queryRows } from '../../../config/database.js';
import { appNotificationFieldsSQL } from './fields.js';

const insertColumnsSQL = `
	recipient_user_id, actor_user_id, app_key, type, entity_type, entity_id,
	title_key, body_key, link_url, data, priority, expires_at, id
`;

function getCreateValues(notification) {
	return [
		notification.recipientUserId,
		notification.actorUserId ?? null,
		notification.appKey,
		notification.type,
		notification.entityType ?? null,
		notification.entityId ?? null,
		notification.titleKey ?? null,
		notification.bodyKey ?? null,
		notification.linkUrl ?? null,
		notification.data ?? {},
		notification.priority ?? 'normal',
		notification.expiresAt ?? null,
		randomUUID(),
	];
}

export async function create(notification) {
	const q = `
		INSERT INTO app_notifications (${insertColumnsSQL})
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING ${appNotificationFieldsSQL};
	`;
	const rows = await queryRows(q, getCreateValues(notification));
	return rows[0] || null;
}

export async function createIfNotExists(notification) {
	const values = getCreateValues(notification);
	const [recipientUserId, , appKey, type, entityType, entityId] = values;
	const lockKey = JSON.stringify([
		recipientUserId, appKey, type, entityType, entityId,
	]);
	const q = `
		INSERT INTO app_notifications (${insertColumnsSQL})
		SELECT
			$1::uuid, $2::uuid, $3::varchar(32), $4::varchar(80),
			$5::varchar(80), $6::uuid, $7::varchar(160), $8::varchar(160),
			$9::varchar(500), $10::jsonb, $11::app_notification_priority,
			$12::timestamptz, $13::uuid
		WHERE NOT EXISTS (
			SELECT 1
			FROM app_notifications existing_notification
			WHERE existing_notification.recipient_user_id = $1::uuid
				AND existing_notification.app_key = $3::varchar(32)
				AND existing_notification.type = $4::varchar(80)
				AND existing_notification.entity_type IS NOT DISTINCT FROM $5::varchar(80)
				AND existing_notification.entity_id IS NOT DISTINCT FROM $6::uuid
				AND existing_notification.responded_at IS NULL
				AND (
					existing_notification.expires_at IS NULL
					OR existing_notification.expires_at > NOW()
				)
		)
		RETURNING ${appNotificationFieldsSQL};
	`;
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		await client.query(
			'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0));',
			[lockKey],
		);
		const result = await client.query(q, values);
		await client.query('COMMIT');
		return result.rows[0] || null;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
