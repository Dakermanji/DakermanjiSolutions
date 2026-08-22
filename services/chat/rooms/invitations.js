//! services/chat/rooms/invitations.js

import ChatRoomInvitationsModel from '../../../models/chat/RoomInvitations.js';
import ChatRoomsModel from '../../../models/chat/Rooms.js';
import UserModel from '../../../models/User.js';
import {
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
} from '../../../constants/chat.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { findOpenableRoomConversation } from './access.js';
import { canManageChatRoomMember } from './permissions.js';

export const ROOM_INVITATION_RESULT = Object.freeze({
	OK: 'ok',
	INVALID_INPUT: 'invalid_input',
	ROOM_NOT_FOUND: 'room_not_found',
	TARGET_NOT_FOUND: 'target_not_found',
	SELF_TARGET: 'self_target',
	FORBIDDEN: 'forbidden',
	TARGET_BANNED: 'target_banned',
	TARGET_ALREADY_MEMBER: 'target_already_member',
	INVITE_NOT_CREATED: 'invite_not_created',
});

function createRoomInvitationResult(reason, extra = {}) {
	return {
		ok: reason === ROOM_INVITATION_RESULT.OK,
		reason,
		...extra,
	};
}

function getMemberAccess(member) {
	return member
		? {
			role: member.role || member.member_role,
			status: member.status || member.member_status,
		}
		: null;
}

function isCurrentRoomMember(member) {
	const access = getMemberAccess(member);

	return [
		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
	].includes(access?.status);
}

/**
 * Invite one user to a room as owner/admin.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @param {Date|string|null} [input.expiresAt]
 * @returns {Promise<object>}
 */
export async function inviteRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
	expiresAt = null,
}) {
	if (
		!isValidUuid(conversationId) ||
		!isValidUuid(actorUserId) ||
		!isValidUuid(targetUserId)
	) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.INVALID_INPUT,
		);
	}

	if (actorUserId === targetUserId) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.SELF_TARGET,
		);
	}

	const room = await findOpenableRoomConversation(conversationId, actorUserId);

	if (!room) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.ROOM_NOT_FOUND,
		);
	}

	const actor = getMemberAccess(room);
	if (!canManageChatRoomMember(actor, {
		role: CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		status: CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	})) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.FORBIDDEN,
			{ room },
		);
	}

	const targetUser = await UserModel.findBasicById(targetUserId);
	if (!targetUser) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.TARGET_NOT_FOUND,
			{ room },
		);
	}

	const targetMember = await ChatRoomsModel.findRoomConversationMember({
		conversationId: room.conversation_id,
		userId: targetUserId,
	});

	if (targetMember?.status === CHAT_CONVERSATION_MEMBER_STATUSES.BANNED) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.TARGET_BANNED,
			{ room, targetMember, targetUser },
		);
	}

	if (isCurrentRoomMember(targetMember)) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.TARGET_ALREADY_MEMBER,
			{ room, targetMember, targetUser },
		);
	}

	const invitation = await ChatRoomInvitationsModel.createRoomInvitation({
		conversationId: room.conversation_id,
		invitedUserId: targetUser.id,
		invitedByUserId: actorUserId,
		expiresAt,
	});

	if (!invitation) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.INVITE_NOT_CREATED,
			{ room, targetUser },
		);
	}

	return createRoomInvitationResult(
		ROOM_INVITATION_RESULT.OK,
		{ room, targetUser, targetMember, invitation },
	);
}
