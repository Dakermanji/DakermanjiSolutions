//! services/kanban/permissions.js

export const KANBAN_ROLES = Object.freeze({
    OWNER: 'owner',
    ADMIN: 'admin',
    EDITOR: 'editor',
    OBSERVER: 'observer',
});

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

export function canChangeTaskStage(role, actorUserId, assigneeUserId) {
    return (
        canManageTasks(role) ||
        (canBeAssigned(role) &&
            Boolean(actorUserId) &&
            Boolean(assigneeUserId) &&
            actorUserId === assigneeUserId)
    );
}

export function canPostTaskMessage(role) {
    return canViewProject(role);
}
