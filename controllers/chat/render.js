//! controllers/chat/render.js

import {
	getOpenFriendConversation,
	markFriendConversationRead,
} from '../../services/chat/friends.js';
import { listFriendMessages } from '../../services/chat/messages.js';
import { emitChatUnreadCountsChanged } from '../../services/chat/live.js';
import { isValidUuid } from '../../middlewares/validators/common.js';
import { CHAT_MESSAGE_LIMITS } from '../../constants/chat.js';

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
					styles: ['chat/main'],
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
		}

		if (req.session.chat?.activeConversationId) {
			req.session.chat = {
				...(req.session.chat || {}),
				activeConversationId: null,
			};
		}

		return res.render('chat/main', {
			titleKey: 'chat:title',
			styles: ['chat/main'],
			scripts: ['chat/main'],
			activeChatConversationId: null,
		});
	} catch (error) {
		return next(error);
	}
}
