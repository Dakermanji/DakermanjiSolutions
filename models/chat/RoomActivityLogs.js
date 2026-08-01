//! models/chat/RoomActivityLogs.js

import { queryRows } from '../../config/database.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 50;

const BASE_FIELDS = [
	'id',
	'room_id',
	'conversation_id',
	'actor_user_id',
	'target_user_id',
	'action',
	'entity_type',
	'entity_id',
	'metadata',
	'created_at',
];

const baseFieldsSQL = BASE_FIELDS.join(', ');
const selectBaseFieldsSQL = BASE_FIELDS
	.map((field) => `activity.${field}`)
	.join(', ');

const normalizePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
	const normalized = Number.parseInt(value, 10);

	if (!Number.isInteger(normalized) || normalized < 1) {
		return fallback;
	}

	return Math.min(normalized, max);
};

const normalizeSortDirection = (order) =>
	String(order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

/**
 * Create one room activity log row.
 *
 * @param {object} activity
 * @param {string} activity.roomId
 * @param {string} activity.conversationId
 * @param {string|null} [activity.actorUserId]
 * @param {string|null} [activity.targetUserId]
 * @param {string} activity.action
 * @param {string|null} [activity.entityType]
 * @param {string|null} [activity.entityId]
 * @param {object} [activity.metadata]
 * @returns {Promise<object|null>}
 */
export async function createRoomActivityLog({
	roomId,
	conversationId,
	actorUserId = null,
	targetUserId = null,
	action,
	entityType = null,
	entityId = null,
	metadata = {},
}) {
	const q = `
		INSERT INTO chat_room_activity_logs (
			room_id,
			conversation_id,
			actor_user_id,
			target_user_id,
			action,
			entity_type,
			entity_id,
			metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ${baseFieldsSQL};
	`;

	const rows = await queryRows(q, [
		roomId,
		conversationId,
		actorUserId,
		targetUserId,
		action,
		entityType,
		entityId,
		metadata,
	]);

	return rows[0] || null;
}

/**
 * List one page of room activity logs.
 *
 * @param {object} input
 * @param {string} input.roomId
 * @param {number} [input.page]
 * @param {number} [input.perPage]
 * @param {'asc'|'desc'} [input.order]
 * @returns {Promise<object>}
 */
export async function listRoomActivityLogsPage({
	roomId,
	page = DEFAULT_PAGE,
	perPage = DEFAULT_PER_PAGE,
	order = 'desc',
}) {
	const normalizedPage = normalizePositiveInteger(page, DEFAULT_PAGE);
	const normalizedPerPage = normalizePositiveInteger(
		perPage,
		DEFAULT_PER_PAGE,
		MAX_PER_PAGE,
	);
	const offset = (normalizedPage - 1) * normalizedPerPage;
	const sortDirection = normalizeSortDirection(order);

	const rows = await queryRows(
		`
			SELECT
				${selectBaseFieldsSQL},
				actor.username AS actor_username,
				actor.email AS actor_email,
				target.username AS target_username,
				target.email AS target_email,
				COUNT(*) OVER()::int AS total_count
			FROM chat_room_activity_logs activity
			LEFT JOIN users actor
				ON actor.id = activity.actor_user_id
			LEFT JOIN users target
				ON target.id = activity.target_user_id
			WHERE activity.room_id = $1
			ORDER BY activity.created_at ${sortDirection}, activity.id ${sortDirection}
			LIMIT $2 OFFSET $3;
		`,
		[roomId, normalizedPerPage, offset],
	);

	const total = rows[0]?.total_count || 0;
	const totalPages = Math.ceil(total / normalizedPerPage);
	const items = rows.map(({ total_count: totalCount, ...row }) => row);

	return {
		items,
		page: normalizedPage,
		perPage: normalizedPerPage,
		total,
		totalPages,
		hasNextPage: normalizedPage < totalPages,
		hasPreviousPage: normalizedPage > 1 && totalPages > 0,
	};
}

export default {
	createRoomActivityLog,
	listRoomActivityLogsPage,
};
