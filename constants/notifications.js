//! constants/notifications.js

export const NOTIFICATIONS_REDIRECT = '/notifications';

export const NOTIFICATION_APP_KEYS = Object.freeze({
	ADMIN: 'admin',
	CHAT: 'chat',
	PROJECTS: 'projects',
	SYSTEM: 'system',
	WEATHER: 'weather',
});

export const NOTIFICATION_PRIORITIES = Object.freeze({
	LOW: 'low',
	NORMAL: 'normal',
	HIGH: 'high',
});

export const NOTIFICATION_TYPES = Object.freeze({
	CHAT_ROOM_INVITATION: 'chat_room_invitation',
	CHAT_ROOM_JOIN_REQUEST: 'chat_room_join_request',
	CHAT_ROOM_JOIN_REQUEST_APPROVED: 'chat_room_join_request_approved',
	CHAT_ROOM_JOIN_REQUEST_REJECTED: 'chat_room_join_request_rejected',
});

export const NOTIFICATION_ENTITY_TYPES = Object.freeze({
	CHAT_ROOM_INVITATION: 'chat_room_invitation',
	CHAT_ROOM_JOIN_REQUEST: 'chat_room_join_request',
	CHAT_ROOM_JOIN_REQUEST_RESULT: 'chat_room_join_request_result',
});

export const NOTIFICATION_RESPONSE_KEYS = Object.freeze({
	ACCEPTED: 'accepted',
	APPROVED: 'approved',
	CANCELED: 'canceled',
	IGNORED: 'ignored',
	MARKED_READ: 'marked_read',
	MUTED: 'muted',
	OPENED: 'opened',
	REJECTED: 'rejected',
});

export const NOTIFICATION_LIMITS = Object.freeze({
	APP_KEY_MAX_LENGTH: 32,
	BODY_KEY_MAX_LENGTH: 160,
	ENTITY_TYPE_MAX_LENGTH: 80,
	LINK_URL_MAX_LENGTH: 500,
	PAGE_SIZE: 20,
	RESPONSE_KEY_MAX_LENGTH: 40,
	TITLE_KEY_MAX_LENGTH: 160,
	TYPE_MAX_LENGTH: 80,
});
