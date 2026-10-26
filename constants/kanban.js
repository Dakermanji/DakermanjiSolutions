//! constants/kanban.js

export const KANBAN_PROJECT_LIMITS = Object.freeze({
	NAME_MAX_LENGTH: 160,
	DESCRIPTION_MAX_LENGTH: 2000,
});

export const KANBAN_INVITATION_EXPIRY_DAYS = 7;

export const KANBAN_INVITATION_LIMITS = Object.freeze({
	IDENTIFIER_MAX_LENGTH: 320,
});

export const KANBAN_EVENT_LIMITS = Object.freeze({
	DEFAULT: 50,
	MAX: 100,
});

export const KANBAN_TASK_LIMITS = Object.freeze({
	TITLE_MAX_LENGTH: 200,
	DESCRIPTION_MAX_LENGTH: 10000,
});

export const KANBAN_TASK_STAGES = Object.freeze({
	PENDING: 'pending',
	IN_PROGRESS: 'in_progress',
	DONE: 'done',
});

export const KANBAN_ROLES = Object.freeze({
	OWNER: 'owner',
	ADMIN: 'admin',
	EDITOR: 'editor',
	OBSERVER: 'observer',
});

export const KANBAN_IMPORTANCE_EMOJIS = Object.freeze({
	high: '🚨',
	medium: '⚠️',
	low: '⬇️',
});
