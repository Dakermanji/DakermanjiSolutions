//! services/chat/rooms/permissions.js

import {
	CHAT_CONVERSATION_MEMBER_MANAGE_ROLES,
	CHAT_CONVERSATION_MEMBER_READ_STATUSES,
	CHAT_CONVERSATION_MEMBER_ROLE_RANKS,
	CHAT_CONVERSATION_MEMBER_ROLES,
	CHAT_CONVERSATION_MEMBER_STATUSES,
	CHAT_CONVERSATION_MEMBER_WRITE_STATUSES,
} from '../../../constants/chat.js';

export function canChatMemberRead(status) {
	return CHAT_CONVERSATION_MEMBER_READ_STATUSES.includes(status);
}

export function canChatMemberWrite(status) {
	return CHAT_CONVERSATION_MEMBER_WRITE_STATUSES.includes(status);
}

export function canChatMemberManage(role, status) {
	return (
		CHAT_CONVERSATION_MEMBER_MANAGE_ROLES.includes(role) &&
		canChatMemberWrite(status)
	);
}

export function canViewRoomActivityLog(member) {
	const memberAccess = normalizeChatMemberAccess(member);

	return canChatMemberManage(memberAccess.role, memberAccess.status);
}

function getChatMemberRoleRank(role) {
	return CHAT_CONVERSATION_MEMBER_ROLE_RANKS[role] || 0;
}

function normalizeChatMemberAccess(member = {}) {
	return {
		role: member.role || member.memberRole || member.member_role,
		status: member.status || member.memberStatus || member.member_status,
	};
}

function isChatRoomOwner(member) {
	const memberAccess = normalizeChatMemberAccess(member);

	return (
		memberAccess.role === CHAT_CONVERSATION_MEMBER_ROLES.OWNER &&
		canChatMemberWrite(memberAccess.status)
	);
}

function isCurrentChatRoomMember(member) {
	const memberAccess = normalizeChatMemberAccess(member);

	return [
		CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE,
		CHAT_CONVERSATION_MEMBER_STATUSES.MUTED,
	].includes(memberAccess.status);
}

export function canManageChatRoomMember(actor, target) {
	const actorAccess = normalizeChatMemberAccess(actor);
	const targetAccess = normalizeChatMemberAccess(target);

	if (!canChatMemberManage(actorAccess.role, actorAccess.status)) {
		return false;
	}

	if (targetAccess.role === CHAT_CONVERSATION_MEMBER_ROLES.OWNER) {
		return false;
	}

	const targetRank = getChatMemberRoleRank(targetAccess.role);

	if (targetRank <= 0) {
		return false;
	}

	return getChatMemberRoleRank(actorAccess.role) > targetRank;
}

export function canPromoteChatRoomMember(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		isChatRoomOwner(actor) &&
		targetAccess.role === CHAT_CONVERSATION_MEMBER_ROLES.MEMBER &&
		isCurrentChatRoomMember(targetAccess) &&
		canManageChatRoomMember(actor, targetAccess)
	);
}

export function canDemoteChatRoomMember(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		isChatRoomOwner(actor) &&
		targetAccess.role === CHAT_CONVERSATION_MEMBER_ROLES.ADMIN &&
		isCurrentChatRoomMember(targetAccess) &&
		canManageChatRoomMember(actor, targetAccess)
	);
}

export function canRemoveChatRoomMember(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		isCurrentChatRoomMember(targetAccess) &&
		canManageChatRoomMember(actor, targetAccess)
	);
}

export function canMuteChatRoomMember(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		targetAccess.status === CHAT_CONVERSATION_MEMBER_STATUSES.ACTIVE &&
		canManageChatRoomMember(actor, targetAccess)
	);
}

export function canUnmuteChatRoomMember(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		targetAccess.status === CHAT_CONVERSATION_MEMBER_STATUSES.MUTED &&
		canManageChatRoomMember(actor, targetAccess)
	);
}

export function canBanChatRoomMember(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		isCurrentChatRoomMember(targetAccess) &&
		canManageChatRoomMember(actor, targetAccess)
	);
}

export function canUnbanChatRoomMember(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		targetAccess.status === CHAT_CONVERSATION_MEMBER_STATUSES.BANNED &&
		canManageChatRoomMember(actor, targetAccess)
	);
}

export function canDeleteChatRoomMemberHistory(actor, target) {
	const targetAccess = normalizeChatMemberAccess(target);

	return (
		isChatRoomOwner(actor) &&
		targetAccess.role !== CHAT_CONVERSATION_MEMBER_ROLES.OWNER &&
		getChatMemberRoleRank(targetAccess.role) > 0
	);
}
