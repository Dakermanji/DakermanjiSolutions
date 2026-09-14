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
	createNotesMessage,
	createRoomMessage,
	MESSAGE_WRITE_RESULT,
} from './messages/writes.js';
export {
	notifyMessageMentions,
	notifyMessageReply,
	dismissMessageNotifications,
} from './messages/notifications.js';
export {
	checkMessageProfanity,
	getMessageSafetyDecision,
	shouldReviewMessageProfanity,
} from './messages/safety.js';
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
	findOpenableChatMessageContext,
	findOpenableFriendConversation,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listNotesMessages,
	listOlderFriendMessages,
	listOlderNotesMessages,
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
	createNotesMessage,
	createRoomMessage,
	MESSAGE_WRITE_RESULT,
} from './messages/writes.js';
import {
	notifyMessageMentions,
	notifyMessageReply,
	dismissMessageNotifications,
} from './messages/notifications.js';
import {
	checkMessageProfanity,
	getMessageSafetyDecision,
	shouldReviewMessageProfanity,
} from './messages/safety.js';
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
	findOpenableChatMessageContext,
	findOpenableFriendConversation,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listNotesMessages,
	listOlderFriendMessages,
	listOlderNotesMessages,
	listOlderRoomMessages,
	listRoomMessages,
} from './messages/reads.js';

export default {
	createFriendMessage,
	createNotesMessage,
	createRoomMessage,
	deleteOwnMessage,
	editOwnMessage,
	extractMessageMentionUsernames,
	checkMessageProfanity,
	flagRoomMessage,
	formatMentionToken,
	isMentionUsername,
	getMessageSafetyDecision,
	MESSAGE_WRITE_RESULT,
	listMessageReactionSummary,
	listMessageReactionUsers,
	toggleMessageReaction,
	notifyMessageMentions,
	notifyMessageReply,
	dismissMessageNotifications,
	normalizeMentionUsername,
	shouldReviewMessageProfanity,
	findOpenableFriendConversation,
	findOpenableChatMessageContext,
	findOpenableRoomMessageContext,
	listFriendMessages,
	listNotesMessages,
	listOlderFriendMessages,
	listOlderNotesMessages,
	listOlderRoomMessages,
	listRoomMessages,
};
