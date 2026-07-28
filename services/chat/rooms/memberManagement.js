//! services/chat/rooms/memberManagement.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import {
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
} from './permissions.js';
import { findOpenableRoomConversation } from './access.js';

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
	BAN: 'ban',
	UNBAN: 'unban',
	DELETE_HISTORY: 'delete_history',
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

	return createRoomMemberManagementResult(
		ROOM_MEMBER_MANAGEMENT_RESULT.OK,
		{ room, target, member },
	);
}

export function promoteRoomMember(input) {
	return manageRoomMember({
		...input,
		action: ROOM_MEMBER_MANAGEMENT_ACTIONS.PROMOTE,
	});
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
