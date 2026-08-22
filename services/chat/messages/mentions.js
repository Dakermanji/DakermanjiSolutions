//! services/chat/messages/mentions.js

import {
	CHAT_MESSAGE_MENTION_LIMITS,
	CHAT_MESSAGE_MENTION_RULES,
} from '../../../constants/chat.js';
import { normalizeText } from '../../../middlewares/validators/common.js';

const {
	MAX_PER_MESSAGE,
	USERNAME_MAX_LENGTH,
	USERNAME_MIN_LENGTH,
} = CHAT_MESSAGE_MENTION_LIMITS;
const {
	PREFIX,
	TOKEN_PATTERN_SOURCE,
	USERNAME_PATTERN_SOURCE,
} = CHAT_MESSAGE_MENTION_RULES;

export function normalizeMentionUsername(username) {
	return normalizeText(username, { lower: true });
}
function normalizeMentionTokenUsername(username) {
	return normalizeMentionUsername(username).replace(/\.+$/g, '');
}

export function isMentionUsername(username) {
	const normalizedUsername = normalizeMentionUsername(username);
	if (
		normalizedUsername.length < USERNAME_MIN_LENGTH ||
		normalizedUsername.length > USERNAME_MAX_LENGTH
	) {
		return false;
	}

	return createMentionUsernameRegex().test(normalizedUsername);
}

export function formatMentionToken(username) {
	const normalizedUsername = normalizeMentionUsername(username);
	return normalizedUsername ? `${PREFIX}${normalizedUsername}` : '';
}

export function extractMessageMentionUsernames(body) {
	const normalizedBody = normalizeText(body);
	if (!normalizedBody) return [];

	const mentions = [];
	const seenUsernames = new Set();
	const mentionTokenRegex = createMentionTokenRegex();
	let match;

	while ((match = mentionTokenRegex.exec(normalizedBody)) !== null) {
		const username = normalizeMentionTokenUsername(match[2]);
		if (!isMentionUsername(username) || seenUsernames.has(username)) continue;

		seenUsernames.add(username);
		mentions.push(username);

		if (mentions.length >= MAX_PER_MESSAGE) break;
	}

	return mentions;
}

function createMentionTokenRegex() {
	return new RegExp(TOKEN_PATTERN_SOURCE, 'g');
}

function createMentionUsernameRegex() {
	return new RegExp(`^${USERNAME_PATTERN_SOURCE}$`);
}
