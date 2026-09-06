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
	findOrCreateSelfConversation,
	findSelfConversationForUser,
	findSelfConversationForUserById,
} from './conversations/self.js';

export default {
	countUnreadFriendMessagesForUser,
	findDirectConversation,
	findOrCreateFriendConversation,
	findFriendConversationsForUser,
	findVisibleFriendConversationForUser,
	findFriendConversationForUserById,
	findOrCreateSelfConversation,
	findSelfConversationForUser,
	findSelfConversationForUserById,
};
