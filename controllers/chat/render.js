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
	markRoomConversationRead,
} from '../../services/chat/rooms.js';
import { emitChatUnreadCountsChanged } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
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
	const activeConversationId = req.session.chat?.activeConversationId || null;

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
						'chat/conversation-page/renderer',
						'chat/conversation',
					],
					activeConversation,
					messages: messages.messages,
					hasOlderMessages: messages.hasMore,
					messageBodyMaxLength: CHAT_MESSAGE_LIMITS.BODY_MAX_LENGTH,
				});
			}

			const activeRoomConversation = await getOpenRoomConversation(
				activeConversationId,
				req.user.id,
			);

			if (activeRoomConversation) {
				const messages = await listRoomMessages(
					activeRoomConversation.conversation.id,
					req.user.id,
				);
				await markRoomConversationRead(
					activeRoomConversation.conversation.id,
					req.user.id,
				);

				return res.render('chat/conversation', {
					titleKey: 'chat:title',
					styles: ['modals/main', 'chat/main'],
					scripts: [
						'chat/conversation-page/dates',
						'chat/conversation-page/renderer',
						'chat/conversation',
					],
					activeConversation: activeRoomConversation,
					messages: messages.messages,
					hasOlderMessages: messages.hasMore,
					messageBodyMaxLength: CHAT_MESSAGE_LIMITS.BODY_MAX_LENGTH,
				});
			}
		}

		if (req.session.chat?.activeConversationId) {
			req.session.chat = {
				...(req.session.chat || {}),
				activeConversationId: null,
			};
		}

		const [friendConversations, roomCounts] = await Promise.all([
			listFriendConversations(req.user.id),
			countVisibleRooms(req.user.id),
		]);

		return res.render('chat/main', {
			titleKey: 'chat:title',
			styles: ['modals/main', 'chat/main'],
			scripts: ['chat/main'],
			activeChatConversationId: null,
			roomVisibility: CHAT_ROOM_VISIBILITY,
			chatSectionCounts: {
				friends: friendConversations.length,
				privateRooms: roomCounts.privateRooms,
				publicRooms: roomCounts.publicRooms,
			},
		});
	} catch (error) {
		return next(error);
	}
}
