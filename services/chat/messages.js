//! services/chat/messages.js

export {
	MESSAGE_BODY_MAX_LENGTH,
	MESSAGE_PAGE_LIMIT,
	RECENT_MESSAGE_LIMIT,
} from './messages/utils.js';
export {
	extractMessageMentionUsernames,
	formatMentionToken,
	isMentionUsername,
	normalizeMentionUsername,
} from './messages/mentions.js';
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
	listMessageReactionUsers,
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
	extractMessageMentionUsernames,
	formatMentionToken,
	isMentionUsername,
	normalizeMentionUsername,
} from './messages/mentions.js';
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
	listMessageReactionUsers,
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
	extractMessageMentionUsernames,
	flagRoomMessage,
	formatMentionToken,
	isMentionUsername,
	listMessageReactionSummary,
	listMessageReactionUsers,
	toggleMessageReaction,
	normalizeMentionUsername,
	findOpenableFriendConversation,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listOlderFriendMessages,
	listOlderRoomMessages,
	listRoomMessages,
};
