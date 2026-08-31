//! models/chat/rooms/queries.js

import {
	CHAT_CONVERSATION_MEMBER_MANAGE_ROLES,
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
} from '../../../constants/chat.js';

const readableMemberStatuses = CHAT_CONVERSATION_MEMBER_READ_STATUSES
	.map((status) => `'${status}'`)
	.join(', ');

const manageableMemberRoles = CHAT_CONVERSATION_MEMBER_MANAGE_ROLES
	.map((role) => `'${role}'`)
	.join(', ');

const activeMemberStatus = CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE;

function buildPendingMessageAudienceCondition(messageAlias, includeSender) {
	const conditions = [
		`(
							ccm.role IN (${manageableMemberRoles})
							AND ccm.status = '${activeMemberStatus}'
						)`,
	];

	if (includeSender) {
		conditions.unshift(`${messageAlias}.sender_user_id = $1`);
	}

	return conditions.join(`
						OR `);
}

function buildVisibleMessageCondition(messageAlias, includeSender = false) {
	return `
					${messageAlias}.moderation_status = 'visible'
					OR (
						${messageAlias}.moderation_status = 'pending_review'
						AND (
							${buildPendingMessageAudienceCondition(messageAlias, includeSender)}
						)
					)
				`;
}

export function buildVisibleRoomsQuery(visibilityCondition) {
	return `
		SELECT
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.keywords,
			cr.visibility,
			cr.join_policy,
			cc.type AS conversation_type,
			cc.title,
			cc.created_by_user_id,
			lm.id AS last_message_id,
			cc.created_at,
			cc.updated_at,
			lm.created_at AS last_message_created_at,
			ccm.role AS member_role,
			ccm.status AS member_status,
			ccm.last_read_message_id,
			owner.username AS owner_username,
			owner.email AS owner_email,
			(
				SELECT COUNT(*)::int
				FROM chat_messages unread_messages
				LEFT JOIN chat_messages read_message
					ON read_message.id = ccm.last_read_message_id
				WHERE unread_messages.conversation_id = cc.id
					AND unread_messages.sender_user_id <> $1
					AND unread_messages.deleted_at IS NULL
					AND (${buildVisibleMessageCondition('unread_messages')})
					AND (
						ccm.last_read_message_id IS NULL
						OR unread_messages.created_at > read_message.created_at
						OR (
							unread_messages.created_at = read_message.created_at
							AND unread_messages.id > read_message.id
						)
					)
			) AS unread_count
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		LEFT JOIN LATERAL (
			SELECT latest_message.id, latest_message.created_at
			FROM chat_messages latest_message
			WHERE latest_message.conversation_id = cc.id
				AND latest_message.deleted_at IS NULL
				AND (${buildVisibleMessageCondition('latest_message', true)})
			ORDER BY latest_message.created_at DESC, latest_message.id DESC
			LIMIT 1
		) lm
			ON true
		WHERE ${visibilityCondition}
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
		ORDER BY
			(lm.id IS NULL) ASC,
			lm.created_at DESC,
			LOWER(cc.title) ASC;
	`;
}

export function buildVisibleRoomsCountQuery(visibilityCondition) {
	return `
		SELECT COUNT(*)::int AS room_count
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		WHERE ${visibilityCondition}
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL;
	`;
}
