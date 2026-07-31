//! services/chat/rooms.js

import {
	validateCreateRoomInput,
	validateUpdateRoomInput,
} from '../../middlewares/validators/chat.js';
import { createRoom } from './rooms/create.js';
import { updateRoom } from './rooms/update.js';
import {
	countVisibleRooms,
	countUnreadPrivateRoomMessages,
	countUnreadPublicRoomMessages,
	countUnreadRoomMessages,
	listPrivateRoomSection,
	listPrivateRooms,
	listPublicRooms,
	searchRooms,
} from './rooms/lists.js';
import {
	listRoomManagementMembers,
	listRoomMembers,
} from './rooms/members.js';
import {
	findOpenableRoomConversation,
	findWritableRoomConversation,
	getOpenRoomConversation,
	joinPublicRoom,
	markRoomConversationRead,
} from './rooms/access.js';
import {
	approvePrivateRoomRequest,
	cancelPrivateRoomRequest,
	rejectPrivateRoomRequest,
	requestPrivateListedRoom,
} from './rooms/requests.js';
import {
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdmin,
	muteRoomMember,
	promoteRoomMember,
	removeRoomMember,
	ROOM_MEMBER_MANAGEMENT_RESULT,
	unbanRoomMember,
} from './rooms/memberManagement.js';
import {
	listRoomActivityLogsPage,
	recordRoomActivity,
} from './rooms/activity.js';

export { createRoom } from './rooms/create.js';
export { updateRoom } from './rooms/update.js';
export {
	countVisibleRooms,
	countUnreadPrivateRoomMessages,
	countUnreadPublicRoomMessages,
	countUnreadRoomMessages,
	listPrivateRoomSection,
	listPrivateRooms,
	listPublicRooms,
	searchRooms,
} from './rooms/lists.js';
export {
	listRoomManagementMembers,
	listRoomMembers,
} from './rooms/members.js';
export {
	findOpenableRoomConversation,
	findWritableRoomConversation,
	getOpenRoomConversation,
	joinPublicRoom,
	markRoomConversationRead,
} from './rooms/access.js';
export {
	approvePrivateRoomRequest,
	cancelPrivateRoomRequest,
	rejectPrivateRoomRequest,
	requestPrivateListedRoom,
} from './rooms/requests.js';
export {
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdmin,
	muteRoomMember,
	promoteRoomMember,
	removeRoomMember,
	ROOM_MEMBER_MANAGEMENT_RESULT,
	unbanRoomMember,
} from './rooms/memberManagement.js';
export {
	listRoomActivityLogsPage,
	recordRoomActivity,
} from './rooms/activity.js';

export default {
	approvePrivateRoomRequest,
	banRoomMember,
	cancelPrivateRoomRequest,
	countVisibleRooms,
	countUnreadPrivateRoomMessages,
	countUnreadPublicRoomMessages,
	countUnreadRoomMessages,
	createRoom,
	deleteRoomMemberHistory,
	demoteRoomAdmin,
	findOpenableRoomConversation,
	findWritableRoomConversation,
	getOpenRoomConversation,
	joinPublicRoom,
	listRoomActivityLogsPage,
	listPrivateRoomSection,
	listPrivateRooms,
	listPublicRooms,
	listRoomManagementMembers,
	listRoomMembers,
	markRoomConversationRead,
	muteRoomMember,
	promoteRoomMember,
	rejectPrivateRoomRequest,
	recordRoomActivity,
	removeRoomMember,
	requestPrivateListedRoom,
	ROOM_MEMBER_MANAGEMENT_RESULT,
	searchRooms,
	unbanRoomMember,
	validateCreateRoomInput,
	validateUpdateRoomInput,
	updateRoom,
};
