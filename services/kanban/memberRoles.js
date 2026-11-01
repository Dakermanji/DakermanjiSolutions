//! services/kanban/memberRoles.js

import { changeMemberRole } from '../../models/kanban/Members.js';

export function updateProjectMemberRole(input) {
	return changeMemberRole(input);
}
