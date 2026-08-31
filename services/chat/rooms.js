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
	acceptRoomInvitation,
	canLogRoomInvitationTarget,
	inviteRoomMember,
	recordRoomInvitationQueueAttempt,
	rejectRoomInvitation,
	ROOM_INVITATION_RESULT,
} from './rooms/invitations.js';
import {
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdmin,
	muteRoomMember,
	promoteRoomMember,
	removeRoomMember,
	ROOM_MEMBER_MANAGEMENT_RESULT,
	unbanRoomMember,
	unmuteRoomMember,
} from './rooms/memberManagement.js';
import {
	approvePendingRoomMessage,
	deleteReviewedFlaggedRoomMessage,
	hidePendingRoomMessage,
	listRoomFlagReviewQueue,
	markRoomMessageFlagsSafe,
	ROOM_FLAG_REVIEW_RESULT,
} from './rooms/flagReview.js';
import {
	getRoomActivityLogsPage,
	listRoomActivityLogsPage,
	recordRoomActivity,
	ROOM_ACTIVITY_LOG_RESULT,
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
	acceptRoomInvitation,
	canLogRoomInvitationTarget,
	inviteRoomMember,
	recordRoomInvitationQueueAttempt,
	rejectRoomInvitation,
	ROOM_INVITATION_RESULT,
} from './rooms/invitations.js';
export {
	banRoomMember,
	deleteRoomMemberHistory,
	demoteRoomAdmin,
	muteRoomMember,
	promoteRoomMember,
	removeRoomMember,
	ROOM_MEMBER_MANAGEMENT_RESULT,
	unbanRoomMember,
	unmuteRoomMember,
} from './rooms/memberManagement.js';
export {
	approvePendingRoomMessage,
	deleteReviewedFlaggedRoomMessage,
	hidePendingRoomMessage,
	listRoomFlagReviewQueue,
	markRoomMessageFlagsSafe,
	ROOM_FLAG_REVIEW_RESULT,
} from './rooms/flagReview.js';
export {
	getRoomActivityLogsPage,
	listRoomActivityLogsPage,
	recordRoomActivity,
	ROOM_ACTIVITY_LOG_RESULT,
} from './rooms/activity.js';

export default {
	acceptRoomInvitation,
	approvePendingRoomMessage,
	approvePrivateRoomRequest,
	banRoomMember,
	canLogRoomInvitationTarget,
	cancelPrivateRoomRequest,
	countVisibleRooms,
	countUnreadPrivateRoomMessages,
	countUnreadPublicRoomMessages,
	countUnreadRoomMessages,
	createRoom,
	deleteRoomMemberHistory,
	deleteReviewedFlaggedRoomMessage,
	demoteRoomAdmin,
	findOpenableRoomConversation,
	findWritableRoomConversation,
	getOpenRoomConversation,
	getRoomActivityLogsPage,
	hidePendingRoomMessage,
	inviteRoomMember,
	joinPublicRoom,
	listRoomFlagReviewQueue,
	listRoomActivityLogsPage,
	listPrivateRoomSection,
	listPrivateRooms,
	listPublicRooms,
	listRoomManagementMembers,
	listRoomMembers,
	markRoomConversationRead,
	markRoomMessageFlagsSafe,
	muteRoomMember,
	promoteRoomMember,
	rejectPrivateRoomRequest,
	rejectRoomInvitation,
	recordRoomActivity,
	recordRoomInvitationQueueAttempt,
	removeRoomMember,
	requestPrivateListedRoom,
	ROOM_ACTIVITY_LOG_RESULT,
	ROOM_FLAG_REVIEW_RESULT,
	ROOM_INVITATION_RESULT,
	ROOM_MEMBER_MANAGEMENT_RESULT,
	searchRooms,
	unbanRoomMember,
	unmuteRoomMember,
	validateCreateRoomInput,
	validateUpdateRoomInput,
	updateRoom,
};
