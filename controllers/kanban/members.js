//! controllers/kanban/members.js

import { answerProjectInvitation, requestProjectInvitation } from '../../services/kanban/invitations.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { dismissNotification } from '../../services/notifications/appNotifications.js';

async function dismissUnavailableInvitationNotification(req) {
	const notificationId = req.body?.notificationId;
	if (isValidUuid(notificationId)) {
		await dismissNotification(notificationId, req.user.id);
	}
}

export async function inviteProjectMember(req, res, next) {
	try {
		const result = await requestProjectInvitation(req.kanbanInvitationInput);
		if (result === 'not_owner') return res.sendStatus(404);
		const errorKeys = {
			self: 'kanban:error.inviteSelf',
			blocked: 'kanban:error.inviteeBlocked',
			already_member: 'kanban:error.alreadyMember',
			already_requested: 'kanban:error.invitationAlreadyRequested',
		};
		req.flash(
			errorKeys[result] ? 'error' : 'success',
			errorKeys[result] || 'kanban:invitationRequestSubmitted',
		);
		return res.redirect(`/kanban/${req.kanbanInvitationInput.projectId}/members`);
	} catch (error) {
		return next(error);
	}
}

export async function acceptProjectInvitation(req, res, next) {
	try {
		const accepted = await answerProjectInvitation(req.kanbanInvitationResponse);
		if (!accepted) await dismissUnavailableInvitationNotification(req);
		req.flash(
			accepted ? 'success' : 'error',
			accepted ? 'kanban:invitationAccepted' : 'kanban:error.invitationUnavailable',
		);
		return res.redirect('/kanban');
	} catch (error) {
		return next(error);
	}
}

export async function declineProjectInvitation(req, res, next) {
	try {
		const declined = await answerProjectInvitation(req.kanbanInvitationResponse);
		if (!declined) await dismissUnavailableInvitationNotification(req);
		req.flash(
			declined ? 'success' : 'error',
			declined ? 'kanban:invitationDeclined' : 'kanban:error.invitationUnavailable',
		);
		return res.redirect('/kanban');
	} catch (error) {
		return next(error);
	}
}
