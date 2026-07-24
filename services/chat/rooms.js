//! services/chat/rooms.js

import { validateCreateRoomInput } from '../../middlewares/validators/chat.js';
import { createRoom } from './rooms/create.js';
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

export { createRoom } from './rooms/create.js';
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

export default {
	approvePrivateRoomRequest,
	cancelPrivateRoomRequest,
	countVisibleRooms,
	countUnreadPrivateRoomMessages,
	countUnreadPublicRoomMessages,
	countUnreadRoomMessages,
	createRoom,
	findOpenableRoomConversation,
	findWritableRoomConversation,
	getOpenRoomConversation,
	joinPublicRoom,
	listPrivateRoomSection,
	listPrivateRooms,
	listPublicRooms,
	markRoomConversationRead,
	rejectPrivateRoomRequest,
	requestPrivateListedRoom,
	searchRooms,
	validateCreateRoomInput,
};
