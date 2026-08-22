//! models/chat/roomInvitations/review.js



import pool, { queryRows } from '../../../config/database.js';

import {

	CHAT_CONVERSATION_MEMBER_ROLES,

	CHAT_CONVERSATION_MEMBER_STATUSES,

	CHAT_ROOM_INVITATION_STATUSES,

} from '../../../constants/chat.js';



/**

 * Accept one pending invitation and activate room membership.

 *

 * @param {object} input

 * @param {string} input.invitationId

 * @param {string} input.userId

 * @returns {Promise<object|null>}

 */

export async function acceptPendingInvitationForUser({

	invitationId,

	userId,

}) {

	const client = await pool.connect();



	try {

		await client.query('BEGIN');



		const invitationResult = await client.query(

			`

				WITH accepted_invitation AS (

					UPDATE chat_room_invitations cri

					SET

						status = $3::chat_room_invitation_status,

						responded_at = NOW(),

						revoked_by_user_id = NULL,

						revoked_at = NULL,

						updated_at = NOW()

					FROM chat_rooms cr

					INNER JOIN chat_conversations cc

						ON cc.id = cr.conversation_id

					WHERE cri.id = $1::uuid

						AND cri.invited_user_id = $2::uuid

						AND cri.room_id = cr.id

						AND cri.status = $4::chat_room_invitation_status

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

								AND banned_member.user_id = $2::uuid

								AND banned_member.status = $5::chat_member_status

								AND banned_member.archived_at IS NULL

						)

					RETURNING

						cri.id,

						cri.room_id,

						cri.invited_user_id,

						cri.invited_by_user_id,

						cri.revoked_by_user_id,

						cri.status,

						cri.responded_at,

						cri.revoked_at,

						cri.expires_at,

						cri.created_at,

						cri.updated_at

				)

				SELECT

					accepted_invitation.*,

					cr.conversation_id,

					cc.title AS room_title

				FROM accepted_invitation

				INNER JOIN chat_rooms cr

					ON cr.id = accepted_invitation.room_id

				INNER JOIN chat_conversations cc

					ON cc.id = cr.conversation_id;

			`,

			[

				invitationId,

				userId,

				CHAT_ROOM_INVITATION_STATUSES.ACCEPTED,

				CHAT_ROOM_INVITATION_STATUSES.PENDING,

				CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,

			],

		);

		const invitation = invitationResult.rows[0];



		if (!invitation) {

			await client.query('ROLLBACK');

			return null;

		}



		await client.query(

			`

				INSERT INTO chat_conversation_members (

					conversation_id,

					user_id,

					role,

					status,

					archived_at

				)

				VALUES ($1, $2, $3::chat_member_role, $4::chat_member_status, NULL)

				ON CONFLICT (conversation_id, user_id)

				DO UPDATE SET

					role = EXCLUDED.role,

					status = EXCLUDED.status,

					archived_at = NULL,

					updated_at = NOW();

			`,

			[

				invitation.conversation_id,

				invitation.invited_user_id,

				CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,

				CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,

			],

		);



		await client.query(

			`

				UPDATE chat_room_join_requests

				SET

					status = 'canceled'::chat_room_join_request_status,

					canceled_at = NOW(),

					updated_at = NOW()

				WHERE room_id = $1

					AND requested_by_user_id = $2

					AND status = 'pending'::chat_room_join_request_status;

			`,

			[invitation.room_id, invitation.invited_user_id],

		);



		await client.query('COMMIT');

		return invitation;

	} catch (error) {

		await client.query('ROLLBACK');

		throw error;

	} finally {

		client.release();

	}

}



/**

 * Reject one pending invitation owned by a user.

 *

 * @param {object} input

 * @param {string} input.invitationId

 * @param {string} input.userId

 * @returns {Promise<object|null>}

 */

export async function rejectPendingInvitationForUser({

	invitationId,

	userId,

}) {

	const q = `
		WITH rejected_invitation AS (
			UPDATE chat_room_invitations
			SET
				status = $3::chat_room_invitation_status,
				responded_at = NOW(),
				revoked_by_user_id = NULL,
				revoked_at = NULL,
				updated_at = NOW()
			WHERE id = $1::uuid
				AND invited_user_id = $2::uuid
				AND status = $4::chat_room_invitation_status
				AND (
					expires_at IS NULL
					OR expires_at > NOW()
				)
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
			rejected_invitation.*,
			cr.conversation_id,
			cc.title AS room_title
		FROM rejected_invitation
		INNER JOIN chat_rooms cr
			ON cr.id = rejected_invitation.room_id
		INNER JOIN chat_conversations cc
			ON cc.id = cr.conversation_id;
	`;

	const rows = await queryRows(q, [
		invitationId,
		userId,
		CHAT_ROOM_INVITATION_STATUSES.REJECTED,
		CHAT_ROOM_INVITATION_STATUSES.PENDING,
	]);



	return rows[0] || null;

}



/**

 * Revoke one pending invitation as a room owner/admin.

 *

 * @param {object} input

 * @param {string} input.invitationId

 * @param {string} input.revokedByUserId

 * @returns {Promise<object|null>}

 */

export async function revokePendingInvitationByManager({

	invitationId,

	revokedByUserId,

}) {

	const q = `

		WITH revoked_invitation AS (

			UPDATE chat_room_invitations cri

			SET

				status = $3::chat_room_invitation_status,

				responded_at = NULL,

				revoked_by_user_id = $2::uuid,

				revoked_at = NOW(),

				updated_at = NOW()

			FROM chat_rooms cr

			INNER JOIN chat_conversations cc

				ON cc.id = cr.conversation_id

			INNER JOIN chat_conversation_members manager

				ON manager.conversation_id = cr.conversation_id

				AND manager.user_id = $2::uuid

				AND manager.role IN ($5::chat_member_role, $6::chat_member_role)

				AND manager.status = $7::chat_member_status

				AND manager.archived_at IS NULL

			WHERE cri.id = $1::uuid

				AND cri.room_id = cr.id

				AND cri.status = $4::chat_room_invitation_status

				AND cr.archived_at IS NULL

				AND cc.archived_at IS NULL

			RETURNING

				cri.id,

				cri.room_id,

				cri.invited_user_id,

				cri.invited_by_user_id,

				cri.revoked_by_user_id,

				cri.status,

				cri.responded_at,

				cri.revoked_at,

				cri.expires_at,

				cri.created_at,

				cri.updated_at

		)

		SELECT

			revoked_invitation.*,

			cr.conversation_id,

			cc.title AS room_title

		FROM revoked_invitation

		INNER JOIN chat_rooms cr

			ON cr.id = revoked_invitation.room_id

		INNER JOIN chat_conversations cc

			ON cc.id = cr.conversation_id;

	`;



	const rows = await queryRows(q, [

		invitationId,

		revokedByUserId,

		CHAT_ROOM_INVITATION_STATUSES.REVOKED,

		CHAT_ROOM_INVITATION_STATUSES.PENDING,

		CHAT_CONVERSATION_MEMBER_ROLES.OWNER,

		CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,

		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,

	]);



	return rows[0] || null;

}

