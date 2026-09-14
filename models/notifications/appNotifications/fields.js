//! models/notifications/appNotifications/fields.js

export const APP_NOTIFICATION_FIELDS = [
	'id', 'recipient_user_id', 'actor_user_id', 'app_key', 'type',
	'entity_type', 'entity_id', 'title_key', 'body_key', 'link_url',
	'data', 'priority', 'read_at', 'dismissed_at', 'responded_at',
	'response_key', 'expires_at', 'created_at', 'updated_at',
];

export const appNotificationFieldsSQL = APP_NOTIFICATION_FIELDS.join(', ');

export function getAppNotificationFieldsWithAlias(alias) {
	return APP_NOTIFICATION_FIELDS.map((field) => `${alias}.${field}`).join(', ');
}
