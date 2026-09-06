//! models/chat/Conversations.js

import {
	findDirectConversation,
	findOrCreateFriendConversation,
} from './conversations/direct.js';
import {
	countUnreadFriendMessagesForUser,
	findFriendConversationForUserById,
	findFriendConversationsForUser,
	findVisibleFriendConversationForUser,
} from './conversations/friends.js';
import {
	deleteSelfConversationMessages,
	findOrCreateSelfConversation,
	findSelfConversationForUser,
	findSelfConversationForUserById,
} from './conversations/self.js';

export {
	findDirectConversation,
	findOrCreateFriendConversation,
} from './conversations/direct.js';
export {
	countUnreadFriendMessagesForUser,
	findFriendConversationForUserById,
	findFriendConversationsForUser,
	findVisibleFriendConversationForUser,
} from './conversations/friends.js';
export {
	deleteSelfConversationMessages,
	findOrCreateSelfConversation,
	findSelfConversationForUser,
	findSelfConversationForUserById,
} from './conversations/self.js';

export default {
	countUnreadFriendMessagesForUser,
	deleteSelfConversationMessages,
	findDirectConversation,
	findOrCreateFriendConversation,
	findFriendConversationsForUser,
	findVisibleFriendConversationForUser,
	findFriendConversationForUserById,
	findOrCreateSelfConversation,
	findSelfConversationForUser,
	findSelfConversationForUserById,
};
