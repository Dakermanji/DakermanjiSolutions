//! constants/chat.js

export const CHAT_REDIRECT = '/chat';

export const CHAT_CONVERSATION_TYPES = Object.freeze({
	FRIEND: 'friend',
	SELF: 'self',
	PUBLIC_ROOM: 'public_room',
	PRIVATE_ROOM: 'private_room',
	PROJECT_ROOM: 'project_room',
});

export const CHAT_ROOM_VISIBILITY = Object.freeze({
	PUBLIC: 'public',
	PRIVATE_LISTED: 'private_listed',
	PRIVATE_UNLISTED: 'private_unlisted',
});

export const CHAT_ROOM_JOIN_POLICIES = Object.freeze({
	OPEN: 'open',
	REQUEST: 'request',
	INVITE_ONLY: 'invite_only',
});

export const CHAT_CONVERSATION_MEMBER_ROLES = Object.freeze({
	OWNER: 'owner',
	ADMIN: 'admin',
	MEMBER: 'member',
});

export const CHAT_CONVERSATION_MEMBER_STATUSES = Object.freeze({
	ACTIVE: 'active',
	MUTED: 'muted',
	BANNED: 'banned',
});

export const CHAT_MESSAGE_LIMITS = Object.freeze({
	BODY_MAX_LENGTH: 2000,
	RECENT_PAGE_SIZE: 10,
	OLDER_PAGE_SIZE: 10,
});
