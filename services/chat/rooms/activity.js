//! services/chat/rooms/activity.js

import { CHAT_ROOM_ACTIVITY_ACTIONS } from '../../../constants/chat.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import RoomActivityLogsModel from '../../../models/chat/RoomActivityLogs.js';

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
		actor: {
			id: activity.actor_user_id,
		},
		target: {
			id: activity.target_user_id,
		},
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

export default {
	formatRoomActivityLog,
	formatRoomActivityLogPage,
	isRoomActivityAction,
	listRoomActivityLogsPage,
	normalizeRoomActivityMetadata,
	recordRoomActivity,
};
