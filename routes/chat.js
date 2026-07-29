//! routes/chat.js

import { Router } from 'express';
import {
	closeFriendConversation,
	cancelPrivateRoomAccessRequest,
	banChatRoomMember,
	createChatRoom,
	createFriendChatMessage,
	createRoomChatMessage,
	deleteChatRoomMemberHistory,
	demoteChatRoomAdmin,
	flagRoomChatMessage,
	getFriendChats,
	getOlderFriendMessages,
	getOlderRoomMessages,
	getPrivateRooms,
	getPublicRooms,
	joinPublicRoomConversation,
	muteChatRoomMember,
	openFriendConversation,
	openRoomConversation,
	promoteChatRoomMember,
	renderChat,
	removeChatRoomMember,
	requestPrivateRoomAccess,
	searchVisibleRooms,
	unbanChatRoomMember,
	updateChatRoom,
} from '../controllers/chat/index.js';

const router = Router();

router.get('/', renderChat);
router.get('/friends', getFriendChats);
router.get('/friends/messages', getOlderFriendMessages);
router.get('/rooms/messages', getOlderRoomMessages);
router.get('/rooms/public', getPublicRooms);
router.get('/rooms/private', getPrivateRooms);
router.get('/rooms/search', searchVisibleRooms);
router.get('/rooms/open/:conversationId', openRoomConversation);
router.post('/friends/open', openFriendConversation);
router.post('/friends/close', closeFriendConversation);
router.post('/friends/messages', createFriendChatMessage);
router.post('/rooms/messages', createRoomChatMessage);
router.post('/rooms/messages/flag', flagRoomChatMessage);
router.post('/rooms', createChatRoom);
router.post('/rooms/update', updateChatRoom);
router.post('/rooms/join', joinPublicRoomConversation);
router.post('/rooms/open', openRoomConversation);
router.post('/rooms/request', requestPrivateRoomAccess);
router.post('/rooms/request/cancel', cancelPrivateRoomAccessRequest);
router.post('/rooms/members/promote', promoteChatRoomMember);
router.post('/rooms/members/demote', demoteChatRoomAdmin);
router.post('/rooms/members/remove', removeChatRoomMember);
router.post('/rooms/members/mute', muteChatRoomMember);
router.post('/rooms/members/ban', banChatRoomMember);
router.post('/rooms/members/unban', unbanChatRoomMember);
router.post('/rooms/members/delete-history', deleteChatRoomMemberHistory);

export default router;
