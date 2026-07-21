//! services/chat/rooms/helpers.js

import {
	CHAT_ROOM_LIMITS,
	CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES,
	CHAT_ROOM_VISIBILITY_JOIN_POLICIES,
} from '../../../constants/chat.js';

const { SEARCH_MAX_LENGTH } = CHAT_ROOM_LIMITS;

export function getRoomSettings(visibility) {
	return {
		conversationType: CHAT_ROOM_VISIBILITY_CONVERSATION_TYPES[visibility],
		joinPolicy: CHAT_ROOM_VISIBILITY_JOIN_POLICIES[visibility],
	};
}

export function normalizeSearchQuery(query) {
	return String(query || '')
		.normalize('NFKC')
		.trim()
		.replace(/\s+/g, ' ')
		.slice(0, SEARCH_MAX_LENGTH);
}

export function escapeLikePattern(value) {
	return value.replace(/[!%_]/g, (character) => `!${character}`);
}
