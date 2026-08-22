//! models/chat/messages/mentions.js

import { queryRows } from '../../../config/database.js';
import { CHAT_CONVERSATION_MEMBER_STATUSES } from '../../../constants/chat.js';

const MENTIONABLE_MEMBER_STATUSES = Object.freeze([
	CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
]);

/**
 * Resolve parsed mention usernames to users who belong to one conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {Array<string>} params.usernames
 * @returns {Promise<Array<object>>}
 */
export async function findMentionableConversationUsersByUsernames({
	conversationId,
	usernames = [],
}) {
	const normalizedUsernames = [...new Set(
		usernames
			.map((username) => String(username || '').trim().toLowerCase())
			.filter(Boolean),
	)];

	if (!conversationId || normalizedUsernames.length === 0) return [];

	const q = `
		SELECT
			u.id,
			u.username,
			u.email,
			u.avatar_seed,
			u.country_code,
			ccm.role,
			ccm.status
		FROM chat_conversation_members ccm
		INNER JOIN users u
			ON u.id = ccm.user_id
		WHERE ccm.conversation_id = $1
			AND ccm.status::text = ANY($3::text[])
			AND LOWER(u.username) = ANY($2::text[])
		ORDER BY array_position($2::text[], LOWER(u.username)), u.username;
	`;

	return queryRows(q, [
		conversationId,
		normalizedUsernames,
		MENTIONABLE_MEMBER_STATUSES,
	]);
}
