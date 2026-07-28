//! models/chat/Rooms.js

import { createRoomConversation } from './rooms/create.js';
import {
	countPrivateRoomsForUser,
	countPublicRoomsForUser,
	findPrivateRoomsForUser,
	findPublicRoomsForUser,
} from './rooms/lists.js';
import {
	countUnreadPrivateRoomMessagesForUser,
	countUnreadPublicRoomMessagesForUser,
	countUnreadRoomMessagesForUser,
} from './rooms/unread.js';
import {
	findVisibleRoomConversationForUser,
	joinPublicRoomConversation,
} from './rooms/access.js';
import {
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdminToMember,
	muteRoomMember,
	promoteRoomMemberToAdmin,
	removeRoomMember,
	unbanRoomMember,
} from './rooms/memberManagement.js';
import { findRoomConversationMembers } from './rooms/members.js';
import { searchVisibleRoomsForUser } from './rooms/search.js';

export { createRoomConversation } from './rooms/create.js';
export {
	countPrivateRoomsForUser,
	countPublicRoomsForUser,
	findPrivateRoomsForUser,
	findPublicRoomsForUser,
} from './rooms/lists.js';
export {
	countUnreadPrivateRoomMessagesForUser,
	countUnreadPublicRoomMessagesForUser,
	countUnreadRoomMessagesForUser,
} from './rooms/unread.js';
export {
	findVisibleRoomConversationForUser,
	joinPublicRoomConversation,
} from './rooms/access.js';
export {
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdminToMember,
	muteRoomMember,
	promoteRoomMemberToAdmin,
	removeRoomMember,
	unbanRoomMember,
} from './rooms/memberManagement.js';
export { findRoomConversationMembers } from './rooms/members.js';
export { searchVisibleRoomsForUser } from './rooms/search.js';

export default {
	countPrivateRoomsForUser,
	countPublicRoomsForUser,
	countUnreadPrivateRoomMessagesForUser,
	countUnreadPublicRoomMessagesForUser,
	countUnreadRoomMessagesForUser,
	createRoomConversation,
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdminToMember,
	findPrivateRoomsForUser,
	findPublicRoomsForUser,
	findRoomConversationMembers,
	findVisibleRoomConversationForUser,
	joinPublicRoomConversation,
	muteRoomMember,
	promoteRoomMemberToAdmin,
	removeRoomMember,
	searchVisibleRoomsForUser,
	unbanRoomMember,
};
