//! models/chat/rooms/memberManagement.js

import pool, { queryRows } from '../../../config/database.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
} from '../../../constants/chat.js';

const MEMBER_RETURN_FIELDS = `
	target.conversation_id,
	target.user_id,
	target.role,
	target.status,
	target.last_read_message_id,
	target.muted_until,
	target.archived_at,
	target.joined_at,
	target.updated_at
`;

async function updateManagedMember({
	conversationId,
	actorUserId,
	targetUserId,
	nextRole = null,
	nextStatus = null,
	archiveTarget = null,
	ownerOnly = false,
	targetRole = null,
	targetStatuses = [],
}) {
	const targetStatusFilter = targetStatuses.length
		? `AND target.status = ANY($8::chat_member_status[])`
		: '';
	const actorRoleFilter = ownerOnly
		? `AND actor.role = $5::chat_member_role
			AND $6::chat_member_role IS NOT NULL`
		: 'AND actor.role IN ($5::chat_member_role, $6::chat_member_role)';
	const targetRoleFilter = targetRole
		? 'AND target.role = $7::chat_member_role'
		: `AND target.role <> $5::chat_member_role
			AND (
				actor.role = $5::chat_member_role
				OR target.role = $7::chat_member_role
			)`;

	const q = `
		UPDATE chat_conversation_members target
		SET
			role = COALESCE($9::chat_member_role, target.role),
			status = COALESCE($10::chat_member_status, target.status),
			archived_at = CASE
				WHEN $11::boolean IS TRUE THEN NOW()
				WHEN $11::boolean IS FALSE THEN NULL
				ELSE target.archived_at
			END,
			muted_until = CASE
				WHEN $10::chat_member_status = $12::chat_member_status THEN target.muted_until
				WHEN $10::chat_member_status IS NOT NULL THEN NULL
				ELSE target.muted_until
			END,
			updated_at = NOW()
		FROM chat_conversation_members actor
		WHERE target.conversation_id = $1
			AND target.user_id = $3
			AND target.conversation_id = actor.conversation_id
			AND actor.user_id = $2
			AND actor.status = $4::chat_member_status
			AND actor.archived_at IS NULL
			${actorRoleFilter}
			${targetRoleFilter}
			${targetStatusFilter}
			AND target.archived_at IS NULL
		RETURNING ${MEMBER_RETURN_FIELDS};
	`;

	const rows = await queryRows(q, [
		conversationId,
		actorUserId,
		targetUserId,
		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
		CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
		targetRole || CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		targetStatuses,
		nextRole,
		nextStatus,
		archiveTarget,
		CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
	]);

	return rows[0] || null;
}

/**
 * Promote a room member to admin. Owner only.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export function promoteRoomMemberToAdmin({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	return updateManagedMember({
		conversationId,
		actorUserId,
		targetUserId,
		nextRole: CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
		nextStatus: CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		archiveTarget: false,
		ownerOnly: true,
		targetRole: CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		targetStatuses: [
			CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
			CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
		],
	});
}

/**
 * Demote a room admin to member. Owner only.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export function demoteRoomAdminToMember({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	return updateManagedMember({
		conversationId,
		actorUserId,
		targetUserId,
		nextRole: CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		nextStatus: CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		archiveTarget: false,
		ownerOnly: true,
		targetRole: CHAT_CONVERSATION_MEMBER_ROLES.ADMIN,
		targetStatuses: [
			CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
			CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
		],
	});
}

/**
 * Soft-remove a room member while keeping membership history.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export function removeRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	return updateManagedMember({
		conversationId,
		actorUserId,
		targetUserId,
		nextRole: CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		nextStatus: CHAT_CONVERSATION_MEMBER_STATUSES.REMOVED,
		archiveTarget: true,
		targetStatuses: [
			CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
			CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
		],
	});
}

/**
 * Mute a room member.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export function muteRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	return updateManagedMember({
		conversationId,
		actorUserId,
		targetUserId,
		nextStatus: CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
		archiveTarget: false,
		targetStatuses: [CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE],
	});
}

/**
 * Unmute a room member.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export function unmuteRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	return updateManagedMember({
		conversationId,
		actorUserId,
		targetUserId,
		nextStatus: CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		archiveTarget: false,
		targetStatuses: [CHAT_CONVERSATION_MEMBER_STATUSES.MUTED],
	});
}

/**
 * Ban a room member.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export function banRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	return updateManagedMember({
		conversationId,
		actorUserId,
		targetUserId,
		nextRole: CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		nextStatus: CHAT_CONVERSATION_MEMBER_STATUSES.BANNED,
		archiveTarget: false,
		targetStatuses: [
			CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
			CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
			CHAT_CONVERSATION_MEMBER_STATUSES.REMOVED,
		],
	});
}

/**
 * Unban a room member by moving them to removed state.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export function unbanRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	return updateManagedMember({
		conversationId,
		actorUserId,
		targetUserId,
		nextRole: CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		nextStatus: CHAT_CONVERSATION_MEMBER_STATUSES.REMOVED,
		archiveTarget: true,
		targetStatuses: [CHAT_CONVERSATION_MEMBER_STATUSES.BANNED],
	});
}

/**
 * Fully delete a member and their room message history. Owner only.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @returns {Promise<object|null>}
 */
export async function deleteRoomMemberHistory({
	conversationId,
	actorUserId,
	targetUserId,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const memberRows = await client.query(
			`
				SELECT
					target.conversation_id,
					target.user_id,
					target.role,
					target.status,
					target.last_read_message_id,
					target.muted_until,
					target.archived_at,
					target.joined_at,
					target.updated_at
				FROM chat_conversation_members target
				INNER JOIN chat_conversation_members actor
					ON actor.conversation_id = target.conversation_id
					AND actor.user_id = $2
					AND actor.role = $4::chat_member_role
					AND actor.status = $5::chat_member_status
					AND actor.archived_at IS NULL
				WHERE target.conversation_id = $1
					AND target.user_id = $3
					AND target.role <> $4::chat_member_role
				LIMIT 1;
			`,
			[
				conversationId,
				actorUserId,
				targetUserId,
				CHAT_CONVERSATION_MEMBER_ROLES.OWNER,
				CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
			],
		);
		const member = memberRows.rows[0];

		if (!member) {
			await client.query('ROLLBACK');
			return null;
		}

		await client.query(
			`
				DELETE FROM chat_room_join_requests
				WHERE room_id IN (
					SELECT id
					FROM chat_rooms
					WHERE conversation_id = $1
				)
					AND requested_by_user_id = $2;
			`,
			[conversationId, targetUserId],
		);

		await client.query(
			`
				DELETE FROM chat_room_invitations
				WHERE room_id IN (
					SELECT id
					FROM chat_rooms
					WHERE conversation_id = $1
				)
					AND invited_user_id = $2;
			`,
			[conversationId, targetUserId],
		);

		await client.query(
			`
				UPDATE chat_conversation_members
				SET
					last_read_message_id = NULL,
					updated_at = NOW()
				WHERE conversation_id = $1
					AND last_read_message_id IN (
						SELECT id
						FROM chat_messages
						WHERE conversation_id = $1
							AND sender_user_id = $2
					);
			`,
			[conversationId, targetUserId],
		);

		await client.query(
			`
				UPDATE chat_conversations
				SET
					last_message_id = NULL,
					updated_at = NOW()
				WHERE id = $1
					AND last_message_id IN (
						SELECT id
						FROM chat_messages
						WHERE conversation_id = $1
							AND sender_user_id = $2
					);
			`,
			[conversationId, targetUserId],
		);

		await client.query(
			`
				DELETE FROM chat_messages
				WHERE conversation_id = $1
					AND sender_user_id = $2;
			`,
			[conversationId, targetUserId],
		);

		await client.query(
			`
				DELETE FROM chat_conversation_members
				WHERE conversation_id = $1
					AND user_id = $2;
			`,
			[conversationId, targetUserId],
		);

		await client.query(
			`
				UPDATE chat_conversations cc
				SET
					last_message_id = (
						SELECT id
						FROM chat_messages
						WHERE conversation_id = cc.id
							AND deleted_at IS NULL
						ORDER BY created_at DESC, id DESC
						LIMIT 1
					),
					updated_at = NOW()
				WHERE cc.id = $1;
			`,
			[conversationId],
		);

		await client.query('COMMIT');
		return member;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
