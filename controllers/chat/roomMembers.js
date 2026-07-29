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
} from '../../services/chat/rooms.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { setActiveChatConversation } from './session.js';

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
export const banChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.ban,
);
export const unbanChatRoomMember = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.unban,
);
export const deleteChatRoomMemberHistory = createRoomMemberActionHandler(
	ROOM_MEMBER_ACTIONS.deleteHistory,
);
