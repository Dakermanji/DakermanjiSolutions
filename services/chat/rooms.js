//! services/chat/rooms.js

import { validateCreateRoomInput } from '../../middlewares/validators/chat.js';
import { createRoom } from './rooms/create.js';
import {
	countVisibleRooms,
	listPrivateRoomSection,
	listPrivateRooms,
	listPublicRooms,
	searchRooms,
} from './rooms/lists.js';
import {
	findOpenableRoomConversation,
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
	listPrivateRoomSection,
	listPrivateRooms,
	listPublicRooms,
	searchRooms,
} from './rooms/lists.js';
export {
	findOpenableRoomConversation,
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
	createRoom,
	findOpenableRoomConversation,
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
