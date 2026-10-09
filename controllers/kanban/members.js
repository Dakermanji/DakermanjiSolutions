//! controllers/kanban/members.js

import { createInvitationRequest } from '../../models/kanban/Members.js';

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
