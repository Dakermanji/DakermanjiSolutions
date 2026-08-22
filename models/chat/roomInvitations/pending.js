//! models/chat/roomInvitations/pending.js

import { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_STATUSES,
	CHAT_ROOM_INVITATION_STATUSES,
} from '../../../constants/chat.js';

/**
 * List pending room invitations for one user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export function findPendingInvitationsForUser(userId) {
	const q = `
		SELECT
			cri.id AS invitation_id,
			cri.status AS invitation_status,
			cri.expires_at AS invitation_expires_at,
			cri.created_at AS invitation_created_at,
			cri.updated_at AS invitation_updated_at,
			cr.id AS room_id,
			cr.conversation_id,
			cr.description,
			cr.keywords,
			cr.visibility,
			cr.join_policy,
			cc.type AS conversation_type,
			cc.title,
			cc.created_by_user_id,
			cc.created_at,
			cc.updated_at,
			inviter.username AS inviter_username,
			inviter.email AS inviter_email,
			owner.username AS owner_username,
			owner.email AS owner_email
		FROM chat_room_invitations cri
		INNER JOIN chat_rooms cr
			ON cr.id = cri.room_id
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id
		INNER JOIN users inviter
			ON inviter.id = cri.invited_by_user_id
		INNER JOIN users owner
			ON owner.id = cc.created_by_user_id
		WHERE cri.invited_user_id = $1::uuid
			AND cri.status = $2::chat_room_invitation_status
			AND (
				cri.expires_at IS NULL
				OR cri.expires_at > NOW()
			)
			AND cr.archived_at IS NULL
			AND cc.archived_at IS NULL
			AND NOT EXISTS (
				SELECT 1
				FROM chat_conversation_members banned_member
				WHERE banned_member.conversation_id = cr.conversation_id
					AND banned_member.user_id = $1::uuid
					AND banned_member.status = $3::chat_member_status
					AND banned_member.archived_at IS NULL
			)
			AND NOT EXISTS (
				SELECT 1
				FROM chat_conversation_members current_member
				WHERE current_member.conversation_id = cr.conversation_id
					AND current_member.user_id = $1::uuid
					AND current_member.archived_at IS NULL
					AND current_member.status <> $4::chat_member_status
			)
		ORDER BY
			cri.updated_at DESC,
			LOWER(cc.title) ASC;
	`;

	return queryRows(q, [
		userId,
		CHAT_ROOM_INVITATION_STATUSES.PENDING,
		CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
		CHAT_CONVERSATION_MEMBER_STATUSES.REMOVED,
	]);
}
