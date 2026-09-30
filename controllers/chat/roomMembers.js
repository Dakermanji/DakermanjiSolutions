//! controllers/chat/roomMembers.js

import { CHAT_OPEN_REDIRECT, CHAT_REDIRECT } from '../../constants/chat.js';
import {
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdmin,
	muteRoomMember,
	promoteRoomMember,
	removeRoomMember,
	unbanRoomMember,
	unmuteRoomMember,
} from '../../services/chat/rooms.js';
import { emitChatRoomMembershipChanged } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { setActiveChatConversation } from './session.js';
import { findOpenableRoomConversation } from '../../services/chat/rooms/access.js';
import { listRoomMembers, listRoomManagementMembers } from '../../services/chat/rooms/members.js';
import { canChatMemberManage } from '../../services/chat/rooms/permissions.js';
import { presenceState } from '../../services/presence/state.js';
import { PRESENCE_STATUSES } from '../../constants/presence.js';

export async function getRoomMemberPresence(req, res, next) {
	const conversationId = String(req.query.conversationId || '').trim();
	if (!isValidUuid(conversationId)) return res.status(400).json({ ok: false });

	try {
		const room = await findOpenableRoomConversation(conversationId, req.user.id);
		if (!room) return res.status(403).json({ ok: false });

		const canManage = canChatMemberManage(room.member_role, room.member_status);
		const members = canManage
			? await listRoomManagementMembers(conversationId, req.user.id)
			: await listRoomMembers(conversationId, req.user.id);
		res.set('Cache-Control', 'no-store');
		return res.json({
			ok: true,
			members: members.map((member) => ({
				id: member.id,
				status: member.social.isBlocked || member.social.isBlocking
					? PRESENCE_STATUSES.OFFLINE
					: presenceState.getStatus(member.id),
			})),
		});
	} catch (error) {
		return next(error);
	}
}

const ROOM_MEMBER_ACTIONS = Object.freeze({
	promote: {
		run: promoteRoomMember,
		successKey: 'chat:members.actions.promoteSuccess',
		errorKey: 'chat:members.actions.promoteError',
	},
	demote: {
		run: demoteRoomAdmin,
		successKey: 'chat:members.actions.demoteSuccess',
		errorKey: 'chat:members.actions.demoteError',
	},
	remove: {
		run: removeRoomMember,
		successKey: 'chat:members.actions.removeSuccess',
		errorKey: 'chat:members.actions.removeError',
	},
	mute: {
		run: muteRoomMember,
		successKey: 'chat:members.actions.muteSuccess',
		errorKey: 'chat:members.actions.muteError',
	},
	unmute: {
		run: unmuteRoomMember,
		successKey: 'chat:members.actions.unmuteSuccess',
		errorKey: 'chat:members.actions.unmuteError',
	},
	ban: {
		run: banRoomMember,
		successKey: 'chat:members.actions.banSuccess',
		errorKey: 'chat:members.actions.banError',
	},
	unban: {
		run: unbanRoomMember,
		successKey: 'chat:members.actions.unbanSuccess',
		errorKey: 'chat:members.actions.unbanError',
	},
	deleteHistory: {
		run: deleteRoomMemberHistory,
		successKey: 'chat:members.actions.deleteHistorySuccess',
		errorKey: 'chat:members.actions.deleteHistoryError',
	},
});

function getRoomMemberActionInput(req) {
	const conversationId = String(req.body?.conversationId || '').trim();
	const targetUserId = String(req.body?.targetUserId || '').trim();

	return {
		conversationId,
		targetUserId,
		isValid: isValidUuid(conversationId) && isValidUuid(targetUserId),
	};
}

function createRoomMemberActionHandler(action) {
	return async function handleRoomMemberAction(req, res, next) {
		const { conversationId, targetUserId, isValid } =
			getRoomMemberActionInput(req);

		if (!isValid) {
			req.flash('error', action.errorKey);
			return res.redirect(CHAT_REDIRECT);
		}

		try {
			const result = await action.run({
				conversationId,
				actorUserId: req.user.id,
				targetUserId,
			});

			if (result.ok) {
				emitChatRoomMembershipChanged(result.member);
			}

			req.flash(
				result.ok ? 'success' : 'error',
				result.ok ? action.successKey : action.errorKey,
			);
			setActiveChatConversation(req, conversationId);
			return res.redirect(CHAT_OPEN_REDIRECT);
		} catch (error) {
			return next(error);
		}
	};
}

export const promoteChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.promote,
);
export const demoteChatRoomAdmin = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.demote,
);
export const removeChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.remove,
);
export const muteChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.mute,
);
export const unmuteChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.unmute,
);
export const banChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.ban,
);
export const unbanChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.unban,
);
export const deleteChatRoomMemberHistory = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.deleteHistory,
);
