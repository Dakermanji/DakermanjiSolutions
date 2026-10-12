//! controllers/notifications/actions.js

import { getChatNotificationActions } from './chat.js';
import { DISMISS_NOTIFICATION_ACTION } from './common.js';
import { getKanbanNotificationActions } from './kanban.js';

export function getNotificationActions(notification) {
	return getKanbanNotificationActions(notification)
		?? [...(getChatNotificationActions(notification) ?? []), DISMISS_NOTIFICATION_ACTION];
}
