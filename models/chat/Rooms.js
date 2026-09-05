//! models/chat/Rooms.js

import { createRoomConversation } from './rooms/create.js';
import { updateRoomConversation } from './rooms/update.js';
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
	leaveRoomConversation,
	muteRoomMember,
	promoteRoomMemberToAdmin,
	removeRoomMember,
	unbanRoomMember,
	unmuteRoomMember,
} from './rooms/memberManagement.js';
import {
	findRoomConversationMember,
	findRoomConversationManagementMembers,
	findRoomConversationMembers,
} from './rooms/members.js';
import { searchVisibleRoomsForUser } from './rooms/search.js';

export { createRoomConversation } from './rooms/create.js';
export { updateRoomConversation } from './rooms/update.js';
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
	leaveRoomConversation,
	muteRoomMember,
	promoteRoomMemberToAdmin,
	removeRoomMember,
	unbanRoomMember,
	unmuteRoomMember,
} from './rooms/memberManagement.js';
export {
	findRoomConversationMember,
	findRoomConversationManagementMembers,
	findRoomConversationMembers,
} from './rooms/members.js';
export { searchVisibleRoomsForUser } from './rooms/search.js';

export default {
	countPrivateRoomsForUser,
	countPublicRoomsForUser,
	countUnreadPrivateRoomMessagesForUser,
	countUnreadPublicRoomMessagesForUser,
	countUnreadRoomMessagesForUser,
	createRoomConversation,
	updateRoomConversation,
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdminToMember,
	leaveRoomConversation,
	findPrivateRoomsForUser,
	findPublicRoomsForUser,
	findRoomConversationMember,
	findRoomConversationManagementMembers,
	findRoomConversationMembers,
	findVisibleRoomConversationForUser,
	joinPublicRoomConversation,
	muteRoomMember,
	promoteRoomMemberToAdmin,
	removeRoomMember,
	searchVisibleRoomsForUser,
	unbanRoomMember,
	unmuteRoomMember,
};
