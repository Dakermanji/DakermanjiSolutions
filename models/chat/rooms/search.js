//! models/chat/rooms/search.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
	CHAT_ROOM_VISIBILITY,
} from '../../../constants/chat.js';

const readableMemberStatuses = CHAT_CONVERSATION_MEMBER_READ_STATUSES
	.map((status) => `'${status}'`)
	.join(', ');

/**
 * Search rooms visible in room discovery.
 *
 * Public and listed private rooms can be discovered by everyone.
 * Unlisted private rooms are searchable only by existing members.
 *
 * @param {object} input
 * @param {string} input.userId
 * @param {string} input.query
 * @param {number} input.limit
 * @returns {Promise<Array>}
 */
export function searchVisibleRoomsForUser({ userId, query, limit }) {
	const q = `
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
			cc.last_message_id,
			cc.created_at,
			cc.updated_at,
			ccm.role AS member_role,
			ccm.status AS member_status,
			ccm.last_read_message_id,
			pending_request.status AS pending_request_status,
			owner.username AS owner_username,
			owner.email AS owner_email
		FROM chat_rooms cr
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		LEFT JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cc.id
			AND ccm.user_id = $1
			AND ccm.archived_at IS NULL
			AND ccm.status IN (${readableMemberStatuses})
		LEFT JOIN chat_conversation_members banned_member
			ON banned_member.conversation_id = cc.id
			AND banned_member.user_id = $1
			AND banned_member.status = $8::chat_member_status
			AND banned_member.archived_at IS NULL
		LEFT JOIN chat_room_join_requests pending_request
			ON pending_request.room_id = cr.id
			AND pending_request.requested_by_user_id = $1
			AND pending_request.status = $6
		WHERE cr.archived_at IS NULL
			AND cc.archived_at IS NULL
			AND banned_member.user_id IS NULL
			AND (
				cr.visibility IN ($3, $4)
				OR (
					cr.visibility = $5
					AND ccm.user_id IS NOT NULL
				)
			)
			AND (
				cc.title ILIKE $2 ESCAPE '!'
				OR EXISTS (
					SELECT 1
					FROM unnest(cr.keywords) AS room_keyword(keyword)
					WHERE room_keyword.keyword ILIKE $2 ESCAPE '!'
				)
				OR COALESCE(cr.description, '') ILIKE $2 ESCAPE '!'
			)
		ORDER BY
			(ccm.user_id IS NULL) ASC,
			CASE
				WHEN cc.title ILIKE $2 ESCAPE '!' THEN 0
				WHEN EXISTS (
					SELECT 1
					FROM unnest(cr.keywords) AS room_keyword(keyword)
					WHERE room_keyword.keyword ILIKE $2 ESCAPE '!'
				) THEN 1
				WHEN COALESCE(cr.description, '') ILIKE $2 ESCAPE '!' THEN 2
				ELSE 3
			END,
			LOWER(cc.title) ASC,
			cc.created_at DESC
		LIMIT $7;
	`;

	return queryRows(q, [
		userId,
		query,
		CHAT_ROOM_VISIBILITY.PUBLIC,
		CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
		CHAT_ROOM_VISIBILITY.PRIVATE_UNLISTED,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
		limit,
		CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
	]);
}
