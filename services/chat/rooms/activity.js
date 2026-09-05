//! services/chat/rooms/activity.js

import { CHAT_ROOM_ACTIVITY_ACTIONS } from '../../../constants/chat.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import RoomActivityLogsModel from '../../../models/chat/RoomActivityLogs.js';
import { findOpenableRoomConversation } from './access.js';
import { canViewRoomActivityLog } from './permissions.js';

export const ROOM_ACTIVITY_LOG_RESULT = Object.freeze({
	OK: 'ok',
	INVALID_INPUT: 'invalid_input',
	ROOM_NOT_FOUND: 'room_not_found',
	FORBIDDEN: 'forbidden',
});

const ROOM_ACTIVITY_ACTION_VALUES = new Set(
	Object.values(CHAT_ROOM_ACTIVITY_ACTIONS),
);

const EMPTY_ACTIVITY_LOG_PAGE = Object.freeze({
	items: [],
	page: 1,
	perPage: 10,
	total: 0,
	totalPages: 0,
	hasNextPage: false,
	hasPreviousPage: false,
});

function normalizeOptionalUuid(value) {
	return isValidUuid(value) ? String(value) : null;
}

function normalizeEntityReference({ entityType, entityId } = {}) {
	const normalizedEntityType = String(entityType || '').trim() || null;
	const normalizedEntityId = String(entityId || '').trim() || null;

	if (!normalizedEntityType || !normalizedEntityId) {
		return {
			entityType: null,
			entityId: null,
		};
	}

	return {
		entityType: normalizedEntityType,
		entityId: normalizedEntityId,
	};
}

function createRoomActivityLogResult(reason, extra = {}) {
	return {
		ok: reason === ROOM_ACTIVITY_LOG_RESULT.OK,
		reason,
		...extra,
	};
}

function formatActivityLogRoom(room) {
	if (!room) return null;

	return {
		id: room.room_id,
		conversationId: room.conversation_id,
		title: room.title,
		visibility: room.visibility,
		memberRole: room.member_role,
		memberStatus: room.member_status,
	};
}

function formatActivityLogUser(activity, prefix) {
	const id = activity?.[`${prefix}_user_id`] || null;
	const username = activity?.[`${prefix}_username`] || null;
	const email = activity?.[`${prefix}_email`] || null;

	return {
		id,
		username,
		email,
		displayName: username || email || null,
	};
}

export function isRoomActivityAction(action) {
	return ROOM_ACTIVITY_ACTION_VALUES.has(action);
}

export function normalizeRoomActivityMetadata(metadata) {
	if (
		!metadata ||
		typeof metadata !== 'object' ||
		Array.isArray(metadata)
	) {
		return {};
	}

	try {
		return JSON.parse(JSON.stringify(metadata));
	} catch {
		return {};
	}
}

export function formatRoomActivityLog(activity) {
	if (!activity) return null;

	return {
		id: activity.id,
		roomId: activity.room_id,
		conversationId: activity.conversation_id,
		action: activity.action,
		actor: formatActivityLogUser(activity, 'actor'),
		target: formatActivityLogUser(activity, 'target'),
		entity: {
			type: activity.entity_type,
			id: activity.entity_id,
		},
		metadata: normalizeRoomActivityMetadata(activity.metadata),
		createdAt: activity.created_at,
	};
}

export function formatRoomActivityLogPage(page = EMPTY_ACTIVITY_LOG_PAGE) {
	return {
		...page,
		items: (page.items || []).map(formatRoomActivityLog).filter(Boolean),
	};
}

export async function recordRoomActivity({
	roomId,
	conversationId,
	actorUserId = null,
	targetUserId = null,
	action,
	entityType = null,
	entityId = null,
	metadata = {},
} = {}) {
	if (!isValidUuid(roomId) || !isValidUuid(conversationId)) return null;
	if (!isRoomActivityAction(action)) return null;

	const entity = normalizeEntityReference({ entityType, entityId });
	const activity = await RoomActivityLogsModel.createRoomActivityLog({
		roomId,
		conversationId,
		actorUserId: normalizeOptionalUuid(actorUserId),
		targetUserId: normalizeOptionalUuid(targetUserId),
		action,
		entityType: entity.entityType,
		entityId: entity.entityId,
		metadata: normalizeRoomActivityMetadata(metadata),
	});

	return formatRoomActivityLog(activity);
}

export function recordRoomMemberJoinedActivity({
	room,
	memberUserId,
	joinSource = null,
} = {}) {
	if (!room || !isValidUuid(memberUserId)) return null;

	return recordRoomActivity({
		roomId: room.room_id || room.id,
		conversationId: room.conversation_id || room.conversationId,
		actorUserId: memberUserId,
		action: CHAT_ROOM_ACTIVITY_ACTIONS.MEMBER_JOINED,
		entityType: 'chat_conversation_member',
		entityId: memberUserId,
		metadata: {
			roomName: room.title || room.room_title,
			joinSource,
		},
	});
}
export async function listRoomActivityLogsPage({
	roomId,
	page,
	perPage,
	order,
} = {}) {
	if (!isValidUuid(roomId)) return { ...EMPTY_ACTIVITY_LOG_PAGE };

	const activityPage = await RoomActivityLogsModel.listRoomActivityLogsPage({
		roomId,
		page,
		perPage,
		order,
	});

	return formatRoomActivityLogPage(activityPage);
}

export async function getRoomActivityLogsPage({
	conversationId,
	actorUserId,
	page,
	perPage,
	order,
} = {}) {
	if (!isValidUuid(conversationId) || !isValidUuid(actorUserId)) {
		return createRoomActivityLogResult(
			ROOM_ACTIVITY_LOG_RESULT.INVALID_INPUT,
			{ activityPage: { ...EMPTY_ACTIVITY_LOG_PAGE }, room: null },
		);
	}

	const room = await findOpenableRoomConversation(conversationId, actorUserId);

	if (!room) {
		return createRoomActivityLogResult(
			ROOM_ACTIVITY_LOG_RESULT.ROOM_NOT_FOUND,
			{ activityPage: { ...EMPTY_ACTIVITY_LOG_PAGE }, room: null },
		);
	}

	if (!canViewRoomActivityLog(room)) {
		return createRoomActivityLogResult(
			ROOM_ACTIVITY_LOG_RESULT.FORBIDDEN,
			{
				activityPage: { ...EMPTY_ACTIVITY_LOG_PAGE },
				room: formatActivityLogRoom(room),
			},
		);
	}

	const activityPage = await listRoomActivityLogsPage({
		roomId: room.room_id,
		page,
		perPage,
		order,
	});

	return createRoomActivityLogResult(
		ROOM_ACTIVITY_LOG_RESULT.OK,
		{
			activityPage,
			room: formatActivityLogRoom(room),
		},
	);
}

export default {
	formatRoomActivityLog,
	formatRoomActivityLogPage,
	getRoomActivityLogsPage,
	isRoomActivityAction,
	listRoomActivityLogsPage,
	normalizeRoomActivityMetadata,
	recordRoomActivity,
	recordRoomMemberJoinedActivity,
	ROOM_ACTIVITY_LOG_RESULT,
};
