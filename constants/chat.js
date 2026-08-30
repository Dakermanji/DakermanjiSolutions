//! constants/chat.js

export const CHAT_REDIRECT = '/chat';
export const CHAT_OPEN_REDIRECT = '/chat?conversation=active';

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

export const CHAT_ROOM_INVITATION_STATUSES = Object.freeze({
	PENDING: 'pending',
	ACCEPTED: 'accepted',
	REJECTED: 'rejected',
	REVOKED: 'revoked',
});

export const CHAT_MESSAGE_FLAG_STATUSES = Object.freeze({
	PENDING: 'pending',
	SAFE: 'safe',
	DELETED: 'deleted',
});

export const CHAT_MESSAGE_QUICK_REACTIONS = Object.freeze([
	Object.freeze({
		icon: '👍',
		title: 'Thumbs up',
		keywords: Object.freeze(['like', 'yes', 'agree', 'good']),
	}),
	Object.freeze({
		icon: '❤️',
		title: 'Heart',
		keywords: Object.freeze(['love', 'care', 'support']),
	}),
	Object.freeze({
		icon: '😂',
		title: 'Face with tears of joy',
		keywords: Object.freeze(['laugh', 'funny', 'lol', 'haha']),
	}),
	Object.freeze({
		icon: '😮',
		title: 'Surprised face',
		keywords: Object.freeze(['wow', 'surprised', 'shock']),
	}),
	Object.freeze({
		icon: '😢',
		title: 'Crying face',
		keywords: Object.freeze(['sad', 'cry', 'tears']),
	}),
]);

export const CHAT_MESSAGE_EXTRA_REACTIONS = Object.freeze([
	Object.freeze({
		icon: '👏',
		title: 'Clapping hands',
		keywords: Object.freeze(['clap', 'bravo', 'applause']),
	}),
	Object.freeze({
		icon: '🔥',
		title: 'Fire',
		keywords: Object.freeze(['hot', 'lit', 'great']),
	}),
	Object.freeze({
		icon: '🙏',
		title: 'Folded hands',
		keywords: Object.freeze(['please', 'thanks', 'pray']),
	}),
	Object.freeze({
		icon: '🎉',
		title: 'Party popper',
		keywords: Object.freeze(['party', 'celebrate', 'congrats']),
	}),
	Object.freeze({
		icon: '🤔',
		title: 'Thinking face',
		keywords: Object.freeze(['think', 'hmm', 'question']),
	}),
]);

export const CHAT_MESSAGE_REACTIONS = Object.freeze([
	...CHAT_MESSAGE_QUICK_REACTIONS.map((reaction) => reaction.icon),
	...CHAT_MESSAGE_EXTRA_REACTIONS.map((reaction) => reaction.icon),
]);

export const CHAT_MESSAGE_REACTION_LABELS = Object.freeze(
	Object.fromEntries([
		...CHAT_MESSAGE_QUICK_REACTIONS,
		...CHAT_MESSAGE_EXTRA_REACTIONS,
	].map((reaction) => [reaction.icon, reaction.title])),
);

export const CHAT_MESSAGE_MENTION_LIMITS = Object.freeze({
	MAX_PER_MESSAGE: 10,
	USERNAME_MIN_LENGTH: 3,
	USERNAME_MAX_LENGTH: 20,
});

export const CHAT_MESSAGE_MENTION_RULES = Object.freeze({
	PREFIX: '@',
	USERNAME_CHARS_PATTERN_SOURCE: 'a-zA-Z0-9_.-',
	USERNAME_PATTERN_SOURCE: '[a-zA-Z0-9_.-]{3,20}',
	TOKEN_PATTERN_SOURCE:
		'(^|[^a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{3,20})(?=$|[^a-zA-Z0-9_.-])',
});

export const CHAT_ROOM_ACTIVITY_ACTIONS = Object.freeze({
	MEMBER_INVITED: 'member_invited',
	ROOM_INVITATION_ACCEPTED: 'room_invitation_accepted',
	ROOM_INVITATION_REJECTED: 'room_invitation_rejected',
	JOIN_REQUEST_APPROVED: 'join_request_approved',
	JOIN_REQUEST_REJECTED: 'join_request_rejected',
	MEMBER_PROMOTED: 'member_promoted',
	ADMIN_DEMOTED: 'admin_demoted',
	MEMBER_MUTED: 'member_muted',
	MEMBER_UNMUTED: 'member_unmuted',
	MEMBER_REMOVED: 'member_removed',
	MEMBER_BANNED: 'member_banned',
	MEMBER_UNBANNED: 'member_unbanned',
	MEMBER_HISTORY_DELETED: 'member_history_deleted',
	ROOM_INFO_UPDATED: 'room_info_updated',
	MESSAGE_FLAGGED: 'message_flagged',
	MESSAGE_MARKED_SAFE: 'message_marked_safe',
	FLAGGED_MESSAGE_DELETED: 'flagged_message_deleted',
	MESSAGE_DELETED_BY_ADMIN: 'message_deleted_by_admin',
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
	[CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED]:
		CHAT_ROOM_JOIN_POLICIES.INVITE_ONLY,
});

export const CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES = Object.freeze({
	[CHAT_ROOM_VISIBILITY.PUBLIC]: CHAT_CONVERSATION_TYPES.PUBLIC_ROOM,
	[CHAT_ROOM_VISIBILITY.PRIVATE_LISTED]: CHAT_CONVERSATION_TYPES.PRIVATE_ROOM,
	[CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED]:
		CHAT_CONVERSATION_TYPES.PRIVATE_ROOM,
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
	REMOVED: 'removed',
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

export const CHAT_CONVERSATION_MEMBER_ROLE_RANKS = Object.freeze({
	[CHAT_CONVERSATION_MEMBER_ROLES.OWNER]: 3,
	[CHAT_CONVERSATION_MEMBER_ROLES.ADMIN]: 2,
	[CHAT_CONVERSATION_MEMBER_ROLES.MEMBER]: 1,
});

export const CHAT_MESSAGE_LIMITS = Object.freeze({
	BODY_MAX_LENGTH: 2000,
	REPLY_PREVIEW_MAX_LENGTH: 120,
	FRIEND_EDIT_DELETE_WINDOW_MS: 5 * 60 * 1000,
	ROOM_EDIT_DELETE_WINDOW_MS: 2 * 60 * 1000,
	RECENT_PAGE_SIZE: 10,
	OLDER_PAGE_SIZE: 10,
});
