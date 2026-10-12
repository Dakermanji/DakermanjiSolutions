//! controllers/notifications/common.js

import { isValidUuid } from '../../middlewares/validators/common.js';
import { dismissNotification } from '../../services/notifications/appNotifications.js';

export const DISMISS_NOTIFICATION_ACTION = Object.freeze({
	key: 'dismiss',
	icon: 'bi-x-lg',
	path: '/notifications/dismiss',
	tooltipKey: 'notifications:actions.dismiss',
});

export function getFirstUuidBodyValue(req, keys) {
	for (const key of keys) {
		const value = String(req.body?.[key] || '').trim();
		if (isValidUuid(value)) return value;
	}
	return '';
}

export async function dismissStaleActionNotification(req) {
	const notificationId = getFirstUuidBodyValue(req, ['notificationId']);
	if (notificationId) {
		await dismissNotification(notificationId, req.user.id);
	}
}
