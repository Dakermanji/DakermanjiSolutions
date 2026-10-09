//! controllers/kanban/members.js

import { createInvitationRequest } from '../../models/kanban/Members.js';

export async function inviteProjectMember(req, res, next) {
	try {
		const invited = await createInvitationRequest(req.kanbanInvitationInput);
		if (!invited) return res.sendStatus(404);
		req.flash('success', 'kanban:invitationRequestSubmitted');
		return res.redirect(`/kanban/${req.kanbanInvitationInput.projectId}`);
	} catch (error) {
		return next(error);
	}
}
