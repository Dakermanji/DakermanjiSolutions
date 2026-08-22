//! models/chat/roomInvitations/create.js



import { queryRows } from '../../../config/database.js';

import {

	CHAT_CONVERSATION_MEMBER_ROLES,

	CHAT_CONVERSATION_MEMBER_STATUSES,

	CHAT_ROOM_INVITATION_STATUSES,

} from '../../../constants/chat.js';



/**

 * Create or refresh a pending room invitation from an owner/admin.

 *

 * @param {object} input

 * @param {string} input.conversationId

 * @param {string} input.invitedUserId

 * @param {string} input.invitedByUserId

 * @param {Date|string|null} [input.expiresAt]

 * @returns {Promise<object|null>}

 */

export async function createRoomInvitation({

	conversationId,

	invitedUserId,

	invitedByUserId,

	expiresAt = null,

}) {

	const q = `
		WITH created_invitation AS (
			INSERT INTO chat_room_invitations (
				room_id,
				invited_user_id,
				invited_by_user_id,
				status,
				expires_at
			)
			SELECT
				cr.id,
				$2::uuid,
				$3::uuid,
				$4::chat_room_invitation_status,
				$8::timestamptz
			FROM chat_rooms cr
			INNER JOIN chat_conversations cc
				ON cc.id = cr.conversation_id
			INNER JOIN chat_conversation_members manager
				ON manager.conversation_id = cr.conversation_id
				AND manager.user_id = $3::uuid
				AND manager.role IN ($5::chat_member_role, $6::chat_member_role)
				AND manager.status = $7::chat_member_status
				AND manager.archived_at IS NULL
			WHERE cr.conversation_id = $1::uuid
				AND cr.archived_at IS NULL
				AND cc.archived_at IS NULL
				AND $2::uuid <> $3::uuid
				AND NOT EXISTS (
					SELECT 1
					FROM chat_conversation_members banned_member
					WHERE banned_member.conversation_id = cr.conversation_id
						AND banned_member.user_id = $2::uuid
						AND banned_member.status = $9::chat_member_status
						AND banned_member.archived_at IS NULL
				)
				AND NOT EXISTS (
					SELECT 1
					FROM chat_conversation_members current_member
					WHERE current_member.conversation_id = cr.conversation_id
						AND current_member.user_id = $2::uuid
						AND current_member.archived_at IS NULL
						AND current_member.status <> $10::chat_member_status
				)
			ON CONFLICT (room_id, invited_user_id)
				WHERE status = 'pending'
			DO UPDATE SET
				invited_by_user_id = EXCLUDED.invited_by_user_id,
				expires_at = EXCLUDED.expires_at,
				updated_at = NOW()
			RETURNING
				id,
				room_id,
				invited_user_id,
				invited_by_user_id,
				revoked_by_user_id,
				status,
				responded_at,
				revoked_at,
				expires_at,
				created_at,
				updated_at
		)
		SELECT
			created_invitation.*,
			cr.conversation_id,
			cc.title AS room_title
		FROM created_invitation
		INNER JOIN chat_rooms cr
			ON cr.id = created_invitation.room_id
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id;
	`;


	const rows = await queryRows(q, [

		conversationId,

		invitedUserId,

		invitedByUserId,

		CHAT_ROOM_INVITATION_STATUSES.PENDING,

		CHAT_CONVERSATION_MEMBER_ROLES.OWNER,

		CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,

		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,

		expiresAt,

		CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,

		CHAT_CONVERSATION_MEMBER_STATUSES.REMOVED,

	]);



	return rows[0] || null;

}

