//! services/kanban/invitations.js

import {
	NOTIFICATION_APP_KEYS,
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_RESPONSE_KEYS,
	NOTIFICATION_TYPES,
} from '../../constants/notifications.js';
import logger from '../../config/logger.js';
import pool from '../../config/database.js';
import {
	addInvitationMember,
	createInvitationRequest,
	findInvitationResponseContext,
	updateInvitationResponse,
} from '../../models/kanban/Members.js';
import { broadcastKanbanProjectEvent } from './live.js';
import { recordInvitationAccepted } from './projectEvents.js';
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
	const client = await pool.connect();
	let answered;
	try {
		await client.query('BEGIN');
		const invitation = await findInvitationResponseContext({
			invitationId,
			userId,
			accept,
		}, client);
		if (!invitation) {
			await client.query('ROLLBACK');
			return false;
		}

		if (accept) {
			await addInvitationMember({
				projectId: invitation.project_id,
				userId,
				role: invitation.role,
			}, client);
		}
		const updated = await updateInvitationResponse({ invitationId, accept }, client);
		if (!updated) {
			await client.query('ROLLBACK');
			return false;
		}
		if (accept) {
			await recordInvitationAccepted({
				projectId: invitation.project_id,
				userId,
				role: invitation.role,
			}, client);
		}

		await client.query('COMMIT');
		answered = { projectId: invitation.project_id, accepted: Boolean(accept) };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}

	if (answered.accepted) {
		broadcastKanbanProjectEvent(answered.projectId, 'kanban:project:activity_changed', {
			projectId: answered.projectId,
			actorUserId: userId,
		});
	}

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
