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
	CHAT_ROOM_INVITATION_ACCEPTED: 'chat_room_invitation_accepted',
	CHAT_ROOM_INVITATION_REJECTED: 'chat_room_invitation_rejected',
	CHAT_ROOM_JOIN_REQUEST: 'chat_room_join_request',
	CHAT_ROOM_JOIN_REQUEST_APPROVED: 'chat_room_join_request_approved',
	CHAT_ROOM_JOIN_REQUEST_REJECTED: 'chat_room_join_request_rejected',
	CHAT_ROOM_MEMBER_PROMOTED: 'chat_room_member_promoted',
	CHAT_ROOM_MEMBER_DEMOTED: 'chat_room_member_demoted',
	CHAT_ROOM_MEMBER_REMOVED: 'chat_room_member_removed',
	CHAT_ROOM_MEMBER_MUTED: 'chat_room_member_muted',
	CHAT_ROOM_MEMBER_UNMUTED: 'chat_room_member_unmuted',
	CHAT_ROOM_MEMBER_BANNED: 'chat_room_member_banned',
	CHAT_ROOM_MEMBER_UNBANNED: 'chat_room_member_unbanned',
	CHAT_ROOM_MEMBER_HISTORY_DELETED: 'chat_room_member_history_deleted',
	CHAT_MESSAGE_MENTION: 'chat_message_mention',
	CHAT_MESSAGE_REPLY: 'chat_message_reply',
	CHAT_MESSAGE_APPROVED: 'chat_message_approved',
	CHAT_MESSAGE_HIDDEN: 'chat_message_hidden',
	CHAT_MESSAGE_DELETED_BY_MODERATOR: 'chat_message_deleted_by_moderator',
});

export const NOTIFICATION_ENTITY_TYPES = Object.freeze({
	CHAT_ROOM_INVITATION: 'chat_room_invitation',
	CHAT_ROOM_INVITATION_RESULT: 'chat_room_invitation_result',
	CHAT_ROOM_JOIN_REQUEST: 'chat_room_join_request',
	CHAT_ROOM_JOIN_REQUEST_RESULT: 'chat_room_join_request_result',
	CHAT_ROOM_MEMBER_MANAGEMENT: 'chat_room_member_management',
	CHAT_MESSAGE_MENTION: 'chat_message_mention',
	CHAT_MESSAGE_REPLY: 'chat_message_reply',
	CHAT_MESSAGE_MODERATION: 'chat_message_moderation',
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
	PREVIEW_SIZE: 5,
	RESPONSE_KEY_MAX_LENGTH: 40,
	TITLE_KEY_MAX_LENGTH: 160,
	TYPE_MAX_LENGTH: 80,
});
