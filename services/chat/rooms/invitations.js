//! services/chat/rooms/invitations.js

import ChatRoomInvitationsModel from '../../../models/chat/RoomInvitations.js';
import {
	NOTIFICATION_ENTITY_TYPES,
	NOTIFICATION_RESPONSE_KEYS,
} from '../../../constants/notifications.js';
import ChatRoomsModel from '../../../models/chat/Rooms.js';
import UserModel from '../../../models/User.js';
import UserFollowsModel from '../../../models/social/Follows.js';
import {
	CHAT_ROOM_ACTIVITY_ACTIONS,
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
} from '../../../constants/chat.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { findOpenableRoomConversation } from './access.js';
import { respondAndDismissNotificationsByEntity } from '../../notifications/appNotifications.js';
import { notifyRoomInvitationCreated } from './notifications.js';
import { canManageChatRoomMember } from './permissions.js';
import { recordRoomActivity } from './activity.js';

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
	RESPONSE_NOT_UPDATED: 'response_not_updated',
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

async function recordRoomInvitationQueueActivity({ room, actorUserId }) {
	return recordRoomActivity({
		roomId: room.room_id,
		conversationId: room.conversation_id,
		actorUserId,
		action: CHAT_ROOM_ACTIVITY_ACTIONS.ROOM_INVITATION_QUEUED,
		metadata: {
			roomName: room.title,
		},
	});
}

async function recordRoomInvitationActivity({ invitation, action }) {
	return recordRoomActivity({
		roomId: invitation.room_id,
		conversationId: invitation.conversation_id,
		actorUserId: invitation.invited_by_user_id,
		targetUserId: invitation.invited_user_id,
		action,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_INVITATION,
		entityId: invitation.id,
		metadata: {
			roomName: invitation.room_title,
			invitationId: invitation.id,
		},
	});
}

async function recordRoomInvitationResponseActivity({ invitation, action }) {
	return recordRoomActivity({
		roomId: invitation.room_id,
		conversationId: invitation.conversation_id,
		actorUserId: invitation.invited_user_id,
		targetUserId: invitation.invited_by_user_id,
		action,
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_INVITATION,
		entityId: invitation.id,
		metadata: {
			roomName: invitation.room_title,
			invitationId: invitation.id,
		},
	});
}

export async function canLogRoomInvitationTarget({
	actorUserId,
	targetUserId,
} = {}) {
	if (
		!isValidUuid(actorUserId) ||
		!isValidUuid(targetUserId) ||
		actorUserId === targetUserId
	) {
		return false;
	}

	const [actorFollowsTarget, targetFollowsActor] = await Promise.all([
		UserFollowsModel.exists(actorUserId, targetUserId),
		UserFollowsModel.exists(targetUserId, actorUserId),
	]);

	return actorFollowsTarget || targetFollowsActor;
}
/**
 * Record a neutral username invitation attempt for owner/admin audit history.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @returns {Promise<object>}
 */
export async function recordRoomInvitationQueueAttempt({
	conversationId,
	actorUserId,
} = {}) {
	if (!isValidUuid(conversationId) || !isValidUuid(actorUserId)) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.INVALID_INPUT,
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

	const activity = await recordRoomInvitationQueueActivity({
		room,
		actorUserId,
	});

	return createRoomInvitationResult(
		ROOM_INVITATION_RESULT.OK,
		{ room, activity },
	);
}
/**
 * Invite one user to a room as owner/admin.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.targetUserId
 * @param {Date|string|null} [input.expiresAt]
 * @param {boolean} [input.logActivity]
 * @returns {Promise<object>}
 */
export async function inviteRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
	expiresAt = null,
	logActivity = true,
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

	if (logActivity) {
		await recordRoomInvitationActivity({
			invitation,
			action: CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_INVITED,
		});
	}

	await notifyRoomInvitationCreated({
		room,
		invitation,
		targetUser,
		actorUserId,
	});

	return createRoomInvitationResult(
		ROOM_INVITATION_RESULT.OK,
		{ room, targetUser, targetMember, invitation },
	);
}
async function respondToRoomInvitation({
	invitationId,
	userId,
	responseKey,
	activityAction,
	run,
}) {
	if (!isValidUuid(invitationId) || !isValidUuid(userId)) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.INVALID_INPUT,
		);
	}

	const invitation = await run({ invitationId, userId });

	if (!invitation) {
		return createRoomInvitationResult(
			ROOM_INVITATION_RESULT.RESPONSE_NOT_UPDATED,
		);
	}

	await recordRoomInvitationResponseActivity({
		invitation,
		action: activityAction,
	});

	await respondAndDismissNotificationsByEntity({
		entityType: NOTIFICATION_ENTITY_TYPES.CHAT_ROOM_INVITATION,
		entityId: invitation.id,
		responseKey,
	});

	return createRoomInvitationResult(
		ROOM_INVITATION_RESULT.OK,
		{ invitation },
	);
}

/**
 * Accept one pending room invitation for the signed-in user.
 *
 * @param {object} input
 * @param {string} input.invitationId
 * @param {string} input.userId
 * @returns {Promise<object>}
 */
export function acceptRoomInvitation({ invitationId, userId }) {
	return respondToRoomInvitation({
		invitationId,
		userId,
		responseKey: NOTIFICATION_RESPONSE_KEYS.ACCEPTED,
		activityAction: CHAT_ROOM_ACTIVITY_ACTIONS.ROOM_INVITATION_ACCEPTED,
		run: ChatRoomInvitationsModel.acceptPendingInvitationForUser,
	});
}

/**
 * Reject one pending room invitation for the signed-in user.
 *
 * @param {object} input
 * @param {string} input.invitationId
 * @param {string} input.userId
 * @returns {Promise<object>}
 */
export function rejectRoomInvitation({ invitationId, userId }) {
	return respondToRoomInvitation({
		invitationId,
		userId,
		responseKey: NOTIFICATION_RESPONSE_KEYS.REJECTED,
		activityAction: CHAT_ROOM_ACTIVITY_ACTIONS.ROOM_INVITATION_REJECTED,
		run: ChatRoomInvitationsModel.rejectPendingInvitationForUser,
	});
}
