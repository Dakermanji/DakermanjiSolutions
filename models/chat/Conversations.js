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

export default {
	countUnreadFriendMessagesForUser,
	findDirectConversation,
	findOrCreateFriendConversation,
	findFriendConversationsForUser,
	findVisibleFriendConversationForUser,
	findFriendConversationForUserById,
};
