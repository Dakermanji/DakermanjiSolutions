//! services/chat/live/unread.js

import ChatConversationMembersModel from '../../../models/chat/ConversationMembers.js';
import { countUnreadFriendMessages } from '../friends.js';
import {
	countUnreadPrivateRoomMessages,
	countUnreadPublicRoomMessages,
} from '../rooms.js';
import {
	getChatSocketServer,
	getChatUserRoom,
} from './state.js';

/**
 * Emit fresh unread counts to selected users.
 *
 * @param {Array<string | null | undefined>} userIds
 * @returns {Promise<void>}
 */
export async function emitChatUnreadCountsChanged(userIds) {
	const chatSocketServer = getChatSocketServer();
	if (!chatSocketServer) return;

	for (const userId of new Set(userIds.filter(Boolean))) {
		const [
			unreadFriendCount,
			unreadPrivateRoomCount,
			unreadPublicRoomCount,
		] = await Promise.all([
			countUnreadFriendMessages(userId),
			countUnreadPrivateRoomMessages(userId),
			countUnreadPublicRoomMessages(userId),
		]);
		const unreadRoomCount = unreadPrivateRoomCount + unreadPublicRoomCount;
		const unreadCount = unreadFriendCount + unreadRoomCount;

		chatSocketServer
			.to(getChatUserRoom(userId))
			.emit('chat:unread:changed', {
				unreadCount,
				sections: {
					friends: unreadFriendCount,
					privateRooms: unreadPrivateRoomCount,
					publicRooms: unreadPublicRoomCount,
				},
			});
	}
}

/**
 * Emit fresh unread counts to all members of one conversation.
 *
 * @param {string} conversationId
 * @returns {Promise<void>}
 */
export async function emitChatUnreadCountsForConversation(conversationId) {
	const userIds =
		await ChatConversationMembersModel.findConversationMemberUserIds(
			conversationId,
		);

	await emitChatUnreadCountsChanged(userIds);
}
