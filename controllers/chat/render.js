//! controllers/chat/render.js

import {
	getOpenFriendConversation,
	listFriendConversations,
	markFriendConversationRead,
} from '../../services/chat/friends.js';
import {
	listFriendMessages,
	listRoomMessages,
} from '../../services/chat/messages.js';
import {
	countVisibleRooms,
	getOpenRoomConversation,
	listRoomManagementMembers,
	listRoomMembers,
	markRoomConversationRead,
} from '../../services/chat/rooms.js';
import { emitChatUnreadCountsChanged } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import {
	clearActiveChatConversation,
	consumeActiveChatConversation,
	consumeFocusedChatMessage,
} from './session.js';
import {
	CHAT_MESSAGE_LIMITS,
	CHAT_ROOM_VISIBILITY,
} from '../../constants/chat.js';

/**
 * Render the chat shell.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function renderChat(req, res, next) {
	const activeConversationId = consumeActiveChatConversation(req);
	const focusMessageId = consumeFocusedChatMessage(req);

	try {
		if (activeConversationId && isValidUuid(activeConversationId)) {
			const activeConversation = await getOpenFriendConversation(
				activeConversationId,
				req.user.id,
			);

			if (activeConversation) {
				const messages = await listFriendMessages(
					activeConversation.conversation.id,
					req.user.id,
				);
				await markFriendConversationRead(
					activeConversation.conversation.id,
					req.user.id,
				);
				await emitChatUnreadCountsChanged([req.user.id]);

				return res.render('chat/conversation', {
					titleKey: 'chat:title',
					styles: ['modals/main', 'chat/main'],
					scripts: [
						'chat/conversation-page/dates',
						'chat/conversation-page/utils',
						'chat/conversation-page/renderer',
						'chat/conversation-page/socket',
						'chat/conversation-page/panels',
						'chat/conversation-page/messages',
						'chat/conversation-page/activity',
						'chat/conversation-page/flagReview',
						'chat/conversation',
					],
					activeConversation,
					focusMessageId,
					messages: messages.messages,
					roomMembers: [],
					hasOlderMessages: messages.hasMore,
					messageBodyMaxLength: CHAT_MESSAGE_LIMITS.BODY_MAX_LENGTH,
					messageMutationWindowMs:
						CHAT_MESSAGE_LIMITS.FRIEND_EDIT_DELETE_WINDOW_MS,
					roomVisibility: CHAT_ROOM_VISIBILITY,
				});
			}

			const activeRoomConversation = await getOpenRoomConversation(
				activeConversationId,
				req.user.id,
			);

			if (activeRoomConversation) {
				const [
					messages,
					roomMembers,
					roomManagementMembers,
				] = await Promise.all([
					listRoomMessages(
						activeRoomConversation.conversation.id,
						req.user.id,
					),
					listRoomMembers(
						activeRoomConversation.conversation.id,
						req.user.id,
					),
					listRoomManagementMembers(
						activeRoomConversation.conversation.id,
						req.user.id,
					),
				]);
				await markRoomConversationRead(
					activeRoomConversation.conversation.id,
					req.user.id,
				);
				await emitChatUnreadCountsChanged([req.user.id]);

				return res.render('chat/conversation', {
					titleKey: 'chat:title',
					styles: ['modals/main', 'chat/main'],
					scripts: [
						'chat/conversation-page/dates',
						'chat/conversation-page/utils',
						'chat/conversation-page/renderer',
						'chat/conversation-page/socket',
						'chat/conversation-page/panels',
						'chat/conversation-page/messages',
						'chat/conversation-page/activity',
						'chat/conversation-page/flagReview',
						'chat/conversation',
					],
					activeConversation: activeRoomConversation,
					focusMessageId,
					messages: messages.messages,
					roomMembers,
					roomManagementMembers,
					hasOlderMessages: messages.hasMore,
					messageBodyMaxLength: CHAT_MESSAGE_LIMITS.BODY_MAX_LENGTH,
					messageMutationWindowMs:
						CHAT_MESSAGE_LIMITS.ROOM_EDIT_DELETE_WINDOW_MS,
					roomVisibility: CHAT_ROOM_VISIBILITY,
				});
			}
		}

		if (req.session.chat?.activeConversationId) {
			clearActiveChatConversation(req);
		}

		const [friendConversations, roomCounts] = await Promise.all([
			listFriendConversations(req.user.id),
			countVisibleRooms(req.user.id),
		]);

		return res.render('chat/main', {
			titleKey: 'chat:title',
			styles: ['modals/main', 'chat/main'],
			scripts: [
				'chat/main-page/utils',
				'chat/main-page/badges',
				'chat/main-page/cards',
				'chat/main-page/sections',
				'chat/main-page/roomSearch',
				'chat/main-page/roomModal',
				'chat/main',
			],
			activeChatConversationId: null,
			roomVisibility: CHAT_ROOM_VISIBILITY,
			chatSectionCounts: {
				friends: friendConversations.length,
				privateRooms: roomCounts.privateRooms,
				publicRooms: roomCounts.publicRooms,
			},
			chatSectionUnreadCounts: {
				friends: friendConversations.reduce(
					(total, item) => total + item.conversation.unreadCount,
					0,
				),
				privateRooms: roomCounts.unreadPrivateRooms,
				publicRooms: roomCounts.unreadPublicRooms,
			},
		});
	} catch (error) {
		return next(error);
	}
}
