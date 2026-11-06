//! services/kanban/permissions.js

import { KANBAN_ROLES } from '../../constants/kanban.js';

const MEMBER_ROLES = new Set(Object.values(KANBAN_ROLES));
const MANAGER_ROLES = new Set([KANBAN_ROLES.OWNER, KANBAN_ROLES.ADMIN]);
const ASSIGNABLE_ROLES = new Set([
    KANBAN_ROLES.OWNER,
    KANBAN_ROLES.ADMIN,
    KANBAN_ROLES.EDITOR,
]);

export function canViewProject(role) {
    return MEMBER_ROLES.has(role);
}

export function canManageMembers(role) {
    return role === KANBAN_ROLES.OWNER;
}

export function canManageTasks(role) {
    return MANAGER_ROLES.has(role);
}

export function canBeAssigned(role) {
    return ASSIGNABLE_ROLES.has(role);
}

export function canChangeTaskAssignee(role, actorUserId, currentAssigneeUserId) {
    return (
        canManageTasks(role) ||
        (Boolean(actorUserId) && actorUserId === currentAssigneeUserId)
    );
}

export function canAssignTaskToRole(role, actorUserId, currentAssigneeUserId, targetRole) {
    if (canManageTasks(role)) return canBeAssigned(targetRole);
    return (
        Boolean(actorUserId) &&
        actorUserId === currentAssigneeUserId &&
        (targetRole === KANBAN_ROLES.OWNER || targetRole === KANBAN_ROLES.ADMIN)
    );
}

export function canReorderTask(role, actorUserId, assigneeUserId) {
    return (
        canManageTasks(role) ||
        (canBeAssigned(role) &&
            Boolean(actorUserId) &&
            Boolean(assigneeUserId) &&
            actorUserId === assigneeUserId)
    );
}

export function canChangeTaskStage(role, actorUserId, assigneeUserId, isOverdue = false) {
	if (isOverdue) return role === KANBAN_ROLES.OWNER;
	return canReorderTask(role, actorUserId, assigneeUserId);
}

export function canPostTaskMessage(role) {
    return canViewProject(role);
}
