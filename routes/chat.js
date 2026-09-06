//! routes/chat.js

import { Router } from 'express';
import {
	approvePendingRoomChatMessage,
	closeFriendConversation,
	cancelPrivateRoomAccessRequest,
	banChatRoomMember,
	createChatRoom,
	createFriendChatMessage,
	createRoomChatMessage,
	deleteFriendChatMessage,
	deleteFlaggedRoomMessage,
	deleteRoomChatMessage,
	deleteChatRoomMemberHistory,
	demoteChatRoomAdmin,
	editFriendChatMessage,
	editRoomChatMessage,
	flagRoomChatMessage,
	getFriendChats,
	getFriendChatMessageReactionUsers,
	getOlderFriendMessages,
	getOlderRoomMessages,
	getPrivateRooms,
	getPublicRooms,
	getRoomActivityLogs,
	getRoomMessageFlags,
	hidePendingRoomChatMessage,
	inviteChatRoomMember,
	getRoomChatMessageReactionUsers,
	joinPublicRoomConversation,
	leaveChatRoom,
	markRoomMessageSafe,
	muteChatRoomMember,
	openFriendConversation,
	openRoomChatMessage,
	openRoomConversation,
	promoteChatRoomMember,
	reactToFriendChatMessage,
	reactToRoomChatMessage,
	renderChat,
	removeChatRoomMember,
	requestPrivateRoomAccess,
	searchVisibleRooms,
	unbanChatRoomMember,
	unmuteChatRoomMember,
	updateChatRoom,
} from '../controllers/chat/index.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);
router.get('/friends/messages', getOlderFriendMessages);
router.get('/friends/messages/reactions', getFriendChatMessageReactionUsers);
router.get('/rooms/messages', getOlderRoomMessages);
router.get('/rooms/messages/reactions', getRoomChatMessageReactionUsers);
router.get('/rooms/public', getPublicRooms);
router.get('/rooms/private', getPrivateRooms);
router.get('/rooms/search', searchVisibleRooms);
router.get('/rooms/activity', getRoomActivityLogs);
router.get('/rooms/flags', getRoomMessageFlags);
router.get('/rooms/open/:conversationId', openRoomConversation);
router.post('/friends/open', openFriendConversation);
router.post('/friends/close', closeFriendConversation);
router.post('/friends/messages', createFriendChatMessage);
router.post('/friends/messages/edit', editFriendChatMessage);
router.post('/friends/messages/delete', deleteFriendChatMessage);
router.post('/friends/messages/react', reactToFriendChatMessage);
router.post('/rooms/messages', createRoomChatMessage);
router.post('/rooms/messages/edit', editRoomChatMessage);
router.post('/rooms/messages/delete', deleteRoomChatMessage);
router.post('/rooms/messages/flag', flagRoomChatMessage);
router.post('/rooms/messages/open', openRoomChatMessage);
router.post('/rooms/messages/react', reactToRoomChatMessage);
router.post('/rooms/flags/safe', markRoomMessageSafe);
router.post('/rooms/flags/delete', deleteFlaggedRoomMessage);
router.post('/rooms/flags/approve-pending', approvePendingRoomChatMessage);
router.post('/rooms/flags/hide-pending', hidePendingRoomChatMessage);
router.post('/rooms', createChatRoom);
router.post('/rooms/update', updateChatRoom);
router.post('/rooms/join', joinPublicRoomConversation);
router.post('/rooms/leave', leaveChatRoom);
router.post('/rooms/open', openRoomConversation);
router.post('/rooms/request', requestPrivateRoomAccess);
router.post('/rooms/request/cancel', cancelPrivateRoomAccessRequest);
router.post('/rooms/invitations', inviteChatRoomMember);
router.post('/rooms/members/promote', promoteChatRoomMember);
router.post('/rooms/members/demote', demoteChatRoomAdmin);
router.post('/rooms/members/remove', removeChatRoomMember);
router.post('/rooms/members/mute', muteChatRoomMember);
router.post('/rooms/members/unmute', unmuteChatRoomMember);
router.post('/rooms/members/ban', banChatRoomMember);
router.post('/rooms/members/unban', unbanChatRoomMember);
router.post('/rooms/members/delete-history', deleteChatRoomMemberHistory);

export default router;
