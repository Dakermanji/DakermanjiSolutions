//! services/kanban/invitations.js

import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_RESPONSE_KEYS,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import logger from '../../config/logger.js';
import { createInvitationRequest, respondToInvitation } from '../../models/kanban/Members.js';
import {
	createNotificationIfNotExists,
	respondAndDismissNotificationsByEntity,
} from '../notifications/appNotifications.js';

export async function requestProjectInvitation(input) {
	const result = await createInvitationRequest(input);
	if (typeof result === 'string') return result;

	const invitation = result.invitation;
	if (invitation.invitee_user_id) {
		try {
			await createNotificationIfNotExists({
				recipientUserId: invitation.invitee_user_id,
				actorUserId: input.ownerUserId,
				appKey: NOTIFICATION_APP_KEYS.PROJECTS,
				type: NOTIFICATION_TYPES.KANBAN_PROJECT_INVITATION,
				entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_PROJECT_INVITATION,
				entityId: invitation.id,
				titleKey: 'notifications:types.kanbanProjectInvitation.title',
				bodyKey: 'notifications:types.kanbanProjectInvitation.body',
				linkUrl: '/kanban',
				data: { projectName: result.projectName },
				priority: NOTIFICATION_PRIORITIES.NORMAL,
				expiresAt: invitation.expires_at,
			});
		} catch (error) {
			logger.warning('Kanban invitation notification failed', {
				type: 'kanban',
				invitationId: invitation.id,
				error,
			});
		}
	}

	return result.status;
}

export async function answerProjectInvitation({ invitationId, userId, accept }) {
	const answered = await respondToInvitation({ invitationId, userId, accept });
	if (!answered) return false;

	try {
		await respondAndDismissNotificationsByEntity({
			entityType: NOTIFICATION_ENTITY_TYPES.KANBAN_PROJECT_INVITATION,
			entityId: invitationId,
			responseKey: accept
				? NOTIFICATION_RESPONSE_KEYS.ACCEPTED
				: NOTIFICATION_RESPONSE_KEYS.REJECTED,
		});
	} catch (error) {
		logger.warning('Kanban invitation notification update failed', {
			type: 'kanban',
			invitationId,
			error,
		});
	}

	return true;
}
