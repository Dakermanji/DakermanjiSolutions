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

export const CHAT_ROOM_SEARCH_ACTIONS = Object.freeze({
	OPEN: 'open',
	JOIN: 'join',
	REQUEST: 'request',
	PENDING: 'pending',
});

export const CHAT_ROOM_JOIN_REQUEST_STATUSES = Object.freeze({
	PENDING: 'pending',
	APPROVED: 'approved',
	REJECTED: 'rejected',
	CANCELED: 'canceled',
});

export const CHAT_ROOM_LIMITS = Object.freeze({
	NAME_MAX_LENGTH: 50,
	DESCRIPTION_MAX_LENGTH: 500,
	KEYWORD_MIN_COUNT: 1,
	KEYWORD_MAX_COUNT: 5,
	KEYWORD_MAX_LENGTH: 24,
	SEARCH_MAX_LENGTH: 80,
	SEARCH_RESULT_LIMIT: 20,
});

export const CHAT_ROOM_VISIBILITY_JOIN_POLICIES = Object.freeze({
	[CHAT_ROOM_VISIBILITY.PUBLIC]: CHAT_ROOM_JOIN_POLICIES.OPEN,
	[CHAT_ROOM_VISIBILITY.PRIVATE_LISTED]: CHAT_ROOM_JOIN_POLICIES.REQUEST,
	[CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED]: CHAT_ROOM_JOIN_POLICIES.INVITE_ONLY,
});

export const CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES = Object.freeze({
	[CHAT_ROOM_VISIBILITY.PUBLIC]: CHAT_CONVERSATION_TYPES.PUBLIC_ROOM,
	[CHAT_ROOM_VISIBILITY.PRIVATE_LISTED]: CHAT_CONVERSATION_TYPES.PRIVATE_ROOM,
	[CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED]: CHAT_CONVERSATION_TYPES.PRIVATE_ROOM,
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

export const CHAT_CONVERSATION_MEMBER_READ_STATUSES = Object.freeze([
	CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
]);

export const CHAT_CONVERSATION_MEMBER_WRITE_STATUSES = Object.freeze([
	CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
]);

export const CHAT_CONVERSATION_MEMBER_MANAGE_ROLES = Object.freeze([
	CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
	CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
]);

export function canChatMemberRead(status) {
	return CHAT_CONVERSATION_MEMBER_READ_STATUSES.includes(status);
}

export function canChatMemberWrite(status) {
	return CHAT_CONVERSATION_MEMBER_WRITE_STATUSES.includes(status);
}

export function canChatMemberManage(role, status) {
	return (
		CHAT_CONVERSATION_MEMBER_MANAGE_ROLES.includes(role) &&
		canChatMemberWrite(status)
	);
}

export const CHAT_MESSAGE_LIMITS = Object.freeze({
	BODY_MAX_LENGTH: 2000,
	RECENT_PAGE_SIZE: 10,
	OLDER_PAGE_SIZE: 10,
});
