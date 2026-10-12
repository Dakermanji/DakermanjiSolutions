//! controllers/notifications/kanban.js

import { NOTIFICATION_TYPES } from '../../constants/notifications.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { DISMISS_NOTIFICATION_ACTION } from './common.js';

const PROJECT_INVITATION_ACTIONS = Object.freeze([
	{
		key: 'accept',
		icon: 'bi-check-lg',
		path: '/kanban/invitations/accept',
		tooltipKey: 'notifications:actions.acceptInvitation',
	},
	{
		key: 'reject',
		icon: 'bi-x-circle',
		path: '/kanban/invitations/decline',
		tooltipKey: 'notifications:actions.rejectInvitation',
	},
]);

const IGNORE_INVITATION_ACTION = Object.freeze({
	...DISMISS_NOTIFICATION_ACTION,
	key: 'ignore',
	icon: 'bi-eye-slash',
	tooltipKey: 'notifications:actions.ignoreInvitation',
});

export function getKanbanNotificationActions(notification) {
	if (notification.type !== NOTIFICATION_TYPES.KANBAN_PROJECT_INVITATION) {
		return null;
	}

	const invitationId = String(notification.entity_id || '').trim();
	return [
		...(!notification.responded_at && isValidUuid(invitationId)
			? PROJECT_INVITATION_ACTIONS.map((action) => ({
				...action,
				fields: { invitationId },
			}))
			: []),
		IGNORE_INVITATION_ACTION,
	];
}
