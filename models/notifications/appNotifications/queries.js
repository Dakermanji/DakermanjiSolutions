//! models/notifications/appNotifications/queries.js

import { queryRows } from '../../../config/database.js';
import { NOTIFICATION_LIMITS } from '../../../constants/notifications.js';
import {
	appNotificationFieldsSQL,
	getAppNotificationFieldsWithAlias,
} from './fields.js';

export function findByRecipient(
	recipientUserId,
	{ limit = NOTIFICATION_LIMITS.PAGE_SIZE, offset = 0 } = {},
) {
	const q = `
		SELECT
			${getAppNotificationFieldsWithAlias('an')},
			actor.username AS actor_username,
			actor.email AS actor_email
		FROM app_notifications an
		LEFT JOIN users actor ON actor.id = an.actor_user_id
		WHERE an.recipient_user_id = $1
			AND an.dismissed_at IS NULL
			AND (an.expires_at IS NULL OR an.expires_at > NOW())
		ORDER BY an.created_at DESC
		LIMIT $2 OFFSET $3;
	`;
	return queryRows(q, [recipientUserId, limit, offset]);
}

export async function countUnreadByRecipient(recipientUserId) {
	const q = `
		SELECT COUNT(*)::int AS count
		FROM app_notifications
		WHERE recipient_user_id = $1
			AND read_at IS NULL
			AND dismissed_at IS NULL
			AND (expires_at IS NULL OR expires_at > NOW());
	`;
	const rows = await queryRows(q, [recipientUserId]);
	return rows[0]?.count || 0;
}

export async function findUnreadSummaryByRecipient(recipientUserId) {
	const q = `
		SELECT
			COUNT(*)::int AS count,
			MIN(expires_at) AS next_expires_at
		FROM app_notifications
		WHERE recipient_user_id = $1
			AND read_at IS NULL
			AND dismissed_at IS NULL
			AND (expires_at IS NULL OR expires_at > NOW());
	`;
	const rows = await queryRows(q, [recipientUserId]);
	return {
		unreadCount: rows[0]?.count || 0,
		nextExpiresAt: rows[0]?.next_expires_at || null,
	};
}

export async function findByIdForRecipient(notificationId, recipientUserId) {
	const q = `
		SELECT ${appNotificationFieldsSQL}
		FROM app_notifications
		WHERE id = $1 AND recipient_user_id = $2
		LIMIT 1;
	`;
	const rows = await queryRows(q, [notificationId, recipientUserId]);
	return rows[0] || null;
}
