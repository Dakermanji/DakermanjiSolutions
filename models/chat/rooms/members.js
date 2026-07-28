//! models/chat/rooms/members.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
} from '../../../constants/chat.js';

const readableMemberStatuses = CHAT_CONVERSATION_MEMBER_READ_STATUSES
	.map((status) => `'${status}'`)
	.join(', ');

const roleSortOrder = [
	CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
	CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
	CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
];

const roleSortSql = roleSortOrder
	.map((role, index) => `WHEN '${role}' THEN ${index + 1}`)
	.join(' ');

const managementMemberStatuses = [
	CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
	CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
];

const managementStatusSortOrder = [
	CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
	CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
];

const managementStatusSortSql = managementStatusSortOrder
	.map((status, index) => `WHEN '${status}' THEN ${index + 1}`)
	.join(' ');

/**
 * Find one room conversation member, including non-readable management states.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.userId
 * @returns {Promise<object|null>}
 */
export async function findRoomConversationMember({
	conversationId,
	userId,
}) {
	const q = `
		SELECT
			conversation_id,
			user_id,
			role,
			status,
			joined_at,
			last_read_message_id,
			muted_until,
			archived_at,
			created_at,
			updated_at
		FROM chat_conversation_members
		WHERE conversation_id = $1
			AND user_id = $2
		LIMIT 1;
	`;

	const rows = await queryRows(q, [conversationId, userId]);
	return rows[0] || null;
}

/**
 * Find readable members for one room conversation.
 *
 * @param {string} conversationId
 * @returns {Promise<Array>}
 */
export function findRoomConversationMembers(conversationId) {
	const q = `
		SELECT
			ccm.conversation_id,
			ccm.user_id,
			ccm.role,
			ccm.status,
			ccm.joined_at,
			ccm.last_read_message_id,
			u.username,
			u.email,
			u.avatar_seed,
			u.country_code
		FROM chat_conversation_members ccm
		INNER JOIN users u
			ON u.id = ccm.user_id
		WHERE ccm.conversation_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		ORDER BY
			CASE ccm.role ${roleSortSql} ELSE 99 END,
			LOWER(COALESCE(u.username, u.email)),
			ccm.joined_at ASC;
	`;

	return queryRows(q, [conversationId]);
}

/**
 * Find members visible in the owner/admin management panel.
 *
 * @param {string} conversationId
 * @returns {Promise<Array>}
 */
export function findRoomConversationManagementMembers(conversationId) {
	const q = `
		SELECT
			ccm.conversation_id,
			ccm.user_id,
			ccm.role,
			ccm.status,
			ccm.joined_at,
			ccm.last_read_message_id,
			u.username,
			u.email,
			u.avatar_seed,
			u.country_code
		FROM chat_conversation_members ccm
		INNER JOIN users u
			ON u.id = ccm.user_id
		WHERE ccm.conversation_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status = ANY($2::chat_member_status[])
		ORDER BY
			CASE
				WHEN ccm.role = $3::chat_member_role THEN 1
				WHEN ccm.role = $4::chat_member_role
					AND ccm.status = $6::chat_member_status THEN 2
				WHEN ccm.role = $5::chat_member_role
					AND ccm.status = $6::chat_member_status THEN 3
				WHEN ccm.status = $7::chat_member_status THEN 4
				WHEN ccm.status = $8::chat_member_status THEN 5
				ELSE 99
			END,
			CASE ccm.role ${roleSortSql} ELSE 99 END,
			CASE ccm.status ${managementStatusSortSql} ELSE 99 END,
			LOWER(COALESCE(u.username, u.email)),
			ccm.joined_at ASC;
	`;

	return queryRows(q, [
		conversationId,
		managementMemberStatuses,
		CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
		CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
		CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
		CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
	]);
}
