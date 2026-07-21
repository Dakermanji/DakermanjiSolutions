//! services/chat/rooms/formatters.js

import {
	CHAT_ROOM_JOIN_POLICIES,
	CHAT_ROOM_JOIN_REQUEST_STATUSES,
	CHAT_ROOM_SEARCH_ACTIONS,
} from '../../../constants/chat.js';

function getSearchAction(room) {
	if (room.member_role) {
		return CHAT_ROOM_SEARCH_ACTIONS.OPEN;
	}

	if (room.pending_request_status === CHAT_ROOM_JOIN_REQUEST_STATUSES.PENDING) {
		return CHAT_ROOM_SEARCH_ACTIONS.PENDING;
	}

	if (room.join_policy === CHAT_ROOM_JOIN_POLICIES.OPEN) {
		return CHAT_ROOM_SEARCH_ACTIONS.JOIN;
	}

	return CHAT_ROOM_SEARCH_ACTIONS.REQUEST;
}

export function formatRoom(room) {
	const ownerName = room.owner_username || room.owner_email || '';

	return {
		room: {
			id: room.room_id,
			conversationId: room.conversation_id,
			title: room.title,
			description: room.description,
			keywords: Array.isArray(room.keywords) ? room.keywords : [],
			visibility: room.visibility,
			joinPolicy: room.join_policy,
			memberRole: room.member_role,
			lastMessageId: room.last_message_id,
			lastMessageCreatedAt: room.last_message_created_at,
			lastReadMessageId: room.last_read_message_id,
			pendingRequestStatus: room.pending_request_status,
			unreadCount: Number(room.unread_count || 0),
			updatedAt: room.updated_at,
		},
		owner: {
			id: room.created_by_user_id,
			username: room.owner_username,
			email: room.owner_email,
			displayName: ownerName,
		},
	};
}

export function formatSearchRoom(room) {
	const formatted = formatRoom(room);

	return {
		...formatted,
		room: {
			...formatted.room,
			isMember: Boolean(room.member_role),
			action: getSearchAction(room),
		},
	};
}

export function formatPendingRoomRequest(request) {
	const formatted = formatRoom(request);

	return {
		request: {
			id: request.request_id,
			status: request.request_status,
			createdAt: request.request_created_at,
			updatedAt: request.request_updated_at,
		},
		...formatted,
		room: {
			...formatted.room,
			action: CHAT_ROOM_SEARCH_ACTIONS.PENDING,
			pendingRequestStatus: request.request_status,
		},
	};
}

export function formatOpenRoomConversation(room) {
	const formatted = formatRoom(room);

	return {
		kind: 'room',
		conversation: {
			id: room.conversation_id,
			lastMessageId: room.last_message_id,
			lastReadMessageId: room.last_read_message_id,
			updatedAt: room.updated_at,
		},
		room: formatted.room,
		owner: formatted.owner,
	};
}
