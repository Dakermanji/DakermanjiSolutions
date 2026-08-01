//! services/chat/rooms/memberManagement.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import {
	CHAT_ROOM_ACTIVITY_ACTIONS,
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
} from '../../../constants/chat.js';
import {
	canBanChatRoomMember,
	canDeleteChatRoomMemberHistory,
	canDemoteChatRoomMember,
	canManageChatRoomMember,
	canMuteChatRoomMember,
	canPromoteChatRoomMember,
	canRemoveChatRoomMember,
	canUnbanChatRoomMember,
	canUnmuteChatRoomMember,
} from './permissions.js';
import { findOpenableRoomConversation } from './access.js';
import { notifyRoomMemberPromoted } from './notifications.js';
import { recordRoomActivity } from './activity.js';

export const ROOM_MEMBER_MANAGEMENT_RESULT = Object.freeze({
	OK: 'ok',
	INVALID_INPUT: 'invalid_input',
	ROOM_NOT_FOUND: 'room_not_found',
	TARGET_NOT_FOUND: 'target_not_found',
	SELF_TARGET: 'self_target',
	FORBIDDEN: 'forbidden',
	ACTION_NOT_ALLOWED: 'action_not_allowed',
});

const ROOM_MEMBER_MANAGEMENT_ACTIONS = Object.freeze({
	PROMOTE: 'promote',
	DEMOTE: 'demote',
	REMOVE: 'remove',
	MUTE: 'mute',
	UNMUTE: 'unmute',
	BAN: 'ban',
	UNBAN: 'unban',
	DELETE_HISTORY: 'delete_history',
});

const CHAT_MEMBER_ACTIVITY_ENTITY_TYPE = 'chat_conversation_member';

const roomMemberActivityActions = Object.freeze({
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.PROMOTE]:
		CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_PROMOTED,
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.DEMOTE]:
		CHAT_ROOM_ACTIVITY_ACTIONS.ADMIN_DEMOTED,
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.REMOVE]:
		CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_REMOVED,
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.MUTE]:
		CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_MUTED,
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.UNMUTE]:
		CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_UNMUTED,
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.BAN]:
		CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_BANNED,
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.UNBAN]:
		CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_UNBANNED,
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.DELETE_HISTORY]:
		CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_HISTORY_DELETED,
});

const actionHandlers = Object.freeze({
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.PROMOTE]: {
		canAct: canPromoteChatRoomMember,
		run: ChatRoomsModel.promoteRoomMemberToAdmin,
	},
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.DEMOTE]: {
		canAct: canDemoteChatRoomMember,
		run: ChatRoomsModel.demoteRoomAdminToMember,
	},
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.REMOVE]: {
		canAct: canRemoveChatRoomMember,
		run: ChatRoomsModel.removeRoomMember,
	},
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.MUTE]: {
		canAct: canMuteChatRoomMember,
		run: ChatRoomsModel.muteRoomMember,
	},
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.UNMUTE]: {
		canAct: canUnmuteChatRoomMember,
		run: ChatRoomsModel.unmuteRoomMember,
	},
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.BAN]: {
		canAct: canBanChatRoomMember,
		run: ChatRoomsModel.banRoomMember,
	},
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.UNBAN]: {
		canAct: canUnbanChatRoomMember,
		run: ChatRoomsModel.unbanRoomMember,
	},
	[ROOM_MEMBER_MANAGEMENT_ACTIONS.DELETE_HISTORY]: {
		canAct: canDeleteChatRoomMemberHistory,
		run: ChatRoomsModel.deleteRoomMemberHistory,
	},
});

function createRoomMemberManagementResult(reason, extra = {}) {
	return {
		ok: reason === ROOM_MEMBER_MANAGEMENT_RESULT.OK,
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

function getMemberActivityMetadata({ room, action, target, member }) {
	return {
		roomName: room.title,
		managementAction: action,
		previousRole: target.role,
		previousStatus: target.status,
		nextRole: member.role,
		nextStatus: member.status,
	};
}

async function recordRoomMemberManagementActivity({
	room,
	action,
	actorUserId,
	target,
	member,
}) {
	const activityAction = roomMemberActivityActions[action];

	if (!activityAction) return null;

	return recordRoomActivity({
		roomId: room.room_id,
		conversationId: room.conversation_id,
		actorUserId,
		targetUserId: member.user_id,
		action: activityAction,
		entityType: CHAT_MEMBER_ACTIVITY_ENTITY_TYPE,
		entityId: member.user_id,
		metadata: getMemberActivityMetadata({ room, action, target, member }),
	});
}

async function manageRoomMember({
	conversationId,
	actorUserId,
	targetUserId,
	action,
}) {
	const handler = actionHandlers[action];

	if (!conversationId || !actorUserId || !targetUserId || !handler) {
		return createRoomMemberManagementResult(
			ROOM_MEMBER_MANAGEMENT_RESULT.INVALID_INPUT,
		);
	}

	if (actorUserId === targetUserId) {
		return createRoomMemberManagementResult(
			ROOM_MEMBER_MANAGEMENT_RESULT.SELF_TARGET,
		);
	}

	const room = await findOpenableRoomConversation(conversationId, actorUserId);

	if (!room) {
		return createRoomMemberManagementResult(
			ROOM_MEMBER_MANAGEMENT_RESULT.ROOM_NOT_FOUND,
		);
	}

	const actor = getMemberAccess(room);

	if (!canManageChatRoomMember(actor, {
		role: CHAT_CONVERSATION_MEMBER_ROLES.MEMBER,
		status: CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
	})) {
		return createRoomMemberManagementResult(
			ROOM_MEMBER_MANAGEMENT_RESULT.FORBIDDEN,
			{ room },
		);
	}

	const target = await ChatRoomsModel.findRoomConversationMember({
		conversationId: room.conversation_id,
		userId: targetUserId,
	});

	if (!target) {
		return createRoomMemberManagementResult(
			ROOM_MEMBER_MANAGEMENT_RESULT.TARGET_NOT_FOUND,
			{ room },
		);
	}

	const targetAccess = getMemberAccess(target);

	if (!handler.canAct(actor, targetAccess)) {
		return createRoomMemberManagementResult(
			ROOM_MEMBER_MANAGEMENT_RESULT.ACTION_NOT_ALLOWED,
			{ room, target },
		);
	}

	const member = await handler.run({
		conversationId: room.conversation_id,
		actorUserId,
		targetUserId,
	});

	if (!member) {
		return createRoomMemberManagementResult(
			ROOM_MEMBER_MANAGEMENT_RESULT.ACTION_NOT_ALLOWED,
			{ room, target },
		);
	}

	await recordRoomMemberManagementActivity({
		room,
		action,
		actorUserId,
		target,
		member,
	});

	return createRoomMemberManagementResult(
		ROOM_MEMBER_MANAGEMENT_RESULT.OK,
		{ room, target, member },
	);
}

export async function promoteRoomMember(input) {
	const result = await manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.PROMOTE,
	});

	if (result.ok) {
		await notifyRoomMemberPromoted({
			room: result.room,
			member: result.member,
			actorUserId: input.actorUserId,
		});
	}

	return result;
}

export function demoteRoomAdmin(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.DEMOTE,
	});
}

export function removeRoomMember(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.REMOVE,
	});
}

export function muteRoomMember(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.MUTE,
	});
}

export function unmuteRoomMember(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.UNMUTE,
	});
}

export function banRoomMember(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.BAN,
	});
}

export function unbanRoomMember(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.UNBAN,
	});
}

export function deleteRoomMemberHistory(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.DELETE_HISTORY,
	});
}
