//! controllers/kanban/members.js

import { createInvitationRequest, respondToInvitation } from '../../models/kanban/Members.js';

export async function inviteProjectMember(req, res, next) {
	try {
		const result = await createInvitationRequest(req.kanbanInvitationInput);
		if (result === 'not_owner') return res.sendStatus(404);
		const errorKeys = {
			self: 'kanban:error.inviteSelf',
			blocked: 'kanban:error.inviteeBlocked',
			already_member: 'kanban:error.alreadyMember',
		};
		req.flash(
			errorKeys[result] ? 'error' : 'success',
			errorKeys[result] || 'kanban:invitationRequestSubmitted',
		);
		return res.redirect(`/kanban/${req.kanbanInvitationInput.projectId}`);
	} catch (error) {
		return next(error);
	}
}

export async function acceptProjectInvitation(req, res, next) {
	try {
		const accepted = await respondToInvitation(req.kanbanInvitationResponse);
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
		const declined = await respondToInvitation(req.kanbanInvitationResponse);
		req.flash(
			declined ? 'success' : 'error',
			declined ? 'kanban:invitationDeclined' : 'kanban:error.invitationUnavailable',
		);
		return res.redirect('/kanban');
	} catch (error) {
		return next(error);
	}
}
