//! models/chat/roomJoinRequests/notifications.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
} from '../../../constants/chat.js';

/**
 * Find notification recipients and display context for one pending join request.
 *
 * @param {string} requestId
 * @returns {Promise<Array>}
 */
export function findPendingJoinRequestNotificationRecipients(requestId) {
	const q = `
		SELECT
			cjr.id AS request_id,
			cjr.requested_by_user_id,
			cr.id AS room_id,
			cr.conversation_id,
			cc.title AS room_title,
			ccm.user_id AS recipient_user_id,
			ccm.role AS recipient_role,
			requester.username AS requester_username,
			requester.email AS requester_email
		FROM chat_room_join_requests cjr
		INNER JOIN chat_rooms cr
			ON cr.id = cjr.room_id
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN chat_conversation_members ccm
			ON ccm.conversation_id = cr.conversation_id
			AND ccm.role IN ($2::chat_member_role, $3::chat_member_role)
			AND ccm.archived_at IS NULL
		INNER JOIN users requester
			ON requester.id = cjr.requested_by_user_id
		WHERE cjr.id = $1
			AND cjr.status = $4::chat_room_join_request_status
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL;
	`;

	return queryRows(q, [
		requestId,
		CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
		CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
		CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING,
	]);
}
