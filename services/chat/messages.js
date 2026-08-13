//! services/chat/messages.js

export {
	MESSAGE_BODY_MAX_LENGTH,
	MESSAGE_PAGE_LIMIT,
	RECENT_MESSAGE_LIMIT,
} from './messages/utils.js';
export {
	createFriendMessage,
	createRoomMessage,
} from './messages/writes.js';
export {
	deleteOwnMessage,
	editOwnMessage,
} from './messages/mutations.js';
export { flagRoomMessage } from './messages/flags.js';
export {
	listMessageReactionSummary,
	toggleMessageReaction,
} from './messages/reactions.js';
export {
	findOpenableFriendConversation,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listOlderFriendMessages,
	listOlderRoomMessages,
	listRoomMessages,
} from './messages/reads.js';

import {
	createFriendMessage,
	createRoomMessage,
} from './messages/writes.js';
import {
	deleteOwnMessage,
	editOwnMessage,
} from './messages/mutations.js';
import { flagRoomMessage } from './messages/flags.js';
import {
	listMessageReactionSummary,
	toggleMessageReaction,
} from './messages/reactions.js';
import {
	findOpenableFriendConversation,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listOlderFriendMessages,
	listOlderRoomMessages,
	listRoomMessages,
} from './messages/reads.js';

export default {
	createFriendMessage,
	createRoomMessage,
	deleteOwnMessage,
	editOwnMessage,
	flagRoomMessage,
	listMessageReactionSummary,
	toggleMessageReaction,
	findOpenableFriendConversation,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listOlderFriendMessages,
	listOlderRoomMessages,
	listRoomMessages,
};
