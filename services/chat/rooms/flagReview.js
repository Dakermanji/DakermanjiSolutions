//! services/chat/rooms/flagReview.js

import MessageFlagsModel from '../../../models/chat/MessageFlags.js';
import { CHAT_ROOM_ACTIVITY_ACTIONS } from '../../../constants/chat.js';
import { isValidUuid } from '../../../middlewares/validators/common.js';
import { getUserAvatarProfile } from '../../avatar/dicebear.js';
import { recordRoomActivity } from './activity.js';
import { findOpenableRoomConversation } from './access.js';
import { canChatMemberManage } from './permissions.js';

export const ROOM_FLAG_REVIEW_RESULT = Object.freeze({
	OK: 'ok',
	INVALID_INPUT: 'invalid_input',
	ROOM_NOT_FOUND: 'room_not_found',
	FORBIDDEN: 'forbidden',
	MESSAGE_NOT_FOUND: 'message_not_found',
});

const FLAG_REVIEW_ACTIVITY_ENTITY_TYPE = 'chat_message';
const MESSAGE_PREVIEW_MAX_LENGTH = 120;

function createFlagReviewResult(reason, extra = {}) {
	return {
		ok: reason === ROOM_FLAG_REVIEW_RESULT.OK,
		reason,
		...extra,
	};
}

function getRoomMemberAccess(room) {
	return {
		role: room?.member_role,
		status: room?.member_status,
	};
}

async function getManageableRoom(conversationId, actorUserId) {
	if (!isValidUuid(conversationId) || !isValidUuid(actorUserId)) {
		return createFlagReviewResult(
			ROOM_FLAG_REVIEW_RESULT.INVALID_INPUT,
			{ room: null },
		);
	}

	const room = await findOpenableRoomConversation(conversationId, actorUserId);

	if (!room) {
		return createFlagReviewResult(
			ROOM_FLAG_REVIEW_RESULT.ROOM_NOT_FOUND,
			{ room: null },
		);
	}

	const actor = getRoomMemberAccess(room);

	if (!canChatMemberManage(actor.role, actor.status)) {
		return createFlagReviewResult(
			ROOM_FLAG_REVIEW_RESULT.FORBIDDEN,
			{ room },
		);
	}

	return createFlagReviewResult(
		ROOM_FLAG_REVIEW_RESULT.OK,
		{ room },
	);
}

function normalizeMessagePreview(body) {
	const preview = String(body || '').replace(/\s+/g, ' ').trim();

	if (preview.length <= MESSAGE_PREVIEW_MAX_LENGTH) {
		return preview;
	}

	return `${preview.slice(0, MESSAGE_PREVIEW_MAX_LENGTH - 1)}...`;
}

function formatFlaggedMessage(message) {
	if (!message) return null;

	const displayName =
		message.sender_username ||
		message.sender_email ||
		'User';
	const avatar = getUserAvatarProfile(
		message.sender_avatar_seed || displayName,
	);

	return {
		id: message.message_id,
		conversationId: message.conversation_id,
		body: message.body,
		preview: normalizeMessagePreview(message.body),
		createdAt: message.message_created_at,
		updatedAt: message.message_updated_at,
		flagCount: Number(message.flag_count || message.reviewed_flag_count || 0),
		firstFlaggedAt: message.first_flagged_at,
		latestFlaggedAt: message.latest_flagged_at,
		sender: {
			id: message.sender_user_id,
			username: message.sender_username,
			email: message.sender_email,
			displayName,
			countryCode: message.sender_country_code,
			avatar: {
				src: avatar.src,
				background: avatar.background,
			},
		},
	};
}

async function recordFlagReviewActivity({
	room,
	actorUserId,
	message,
	action,
}) {
	return recordRoomActivity({
		roomId: room.room_id,
		conversationId: room.conversation_id,
		actorUserId,
		targetUserId: message.sender_user_id,
		action,
		entityType: FLAG_REVIEW_ACTIVITY_ENTITY_TYPE,
		entityId: message.message_id,
		metadata: {
			reviewedFlagCount: Number(message.reviewed_flag_count || 0),
			messagePreview: normalizeMessagePreview(message.body),
		},
	});
}

/**
 * List pending flagged messages for one manageable room.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {'newest'|'oldest'|'most_flagged'} [input.order]
 * @param {number} [input.limit]
 * @returns {Promise<object>}
 */
export async function listRoomFlagReviewQueue({
	conversationId,
	actorUserId,
	order,
	limit,
} = {}) {
	const access = await getManageableRoom(conversationId, actorUserId);

	if (!access.ok) {
		return createFlagReviewResult(access.reason, {
			room: access.room,
			messages: [],
		});
	}

	const messages = await MessageFlagsModel.listPendingRoomMessageFlags({
		conversationId: access.room.conversation_id,
		order,
		limit,
	});

	return createFlagReviewResult(
		ROOM_FLAG_REVIEW_RESULT.OK,
		{
			room: access.room,
			messages: messages.map(formatFlaggedMessage).filter(Boolean),
		},
	);
}

async function reviewFlaggedMessage({
	conversationId,
	actorUserId,
	messageId,
	modelAction,
	activityAction,
}) {
	if (!isValidUuid(messageId)) {
		return createFlagReviewResult(
			ROOM_FLAG_REVIEW_RESULT.INVALID_INPUT,
		);
	}

	const access = await getManageableRoom(conversationId, actorUserId);

	if (!access.ok) {
		return createFlagReviewResult(access.reason, { room: access.room });
	}

	const message = await modelAction({
		conversationId: access.room.conversation_id,
		messageId,
		reviewedByUserId: actorUserId,
	});

	if (!message) {
		return createFlagReviewResult(
			ROOM_FLAG_REVIEW_RESULT.MESSAGE_NOT_FOUND,
			{ room: access.room },
		);
	}

	await recordFlagReviewActivity({
		room: access.room,
		actorUserId,
		message,
		action: activityAction,
	});

	return createFlagReviewResult(
		ROOM_FLAG_REVIEW_RESULT.OK,
		{
			room: access.room,
			message: formatFlaggedMessage(message),
		},
	);
}

/**
 * Mark one flagged room message safe.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.messageId
 * @returns {Promise<object>}
 */
export function markRoomMessageFlagsSafe(input) {
	return reviewFlaggedMessage({
		...input,
		modelAction: MessageFlagsModel.markMessageFlagsSafe,
		activityAction: CHAT_ROOM_ACTIVITY_ACTIONS.MESSAGE_MARKED_SAFE,
	});
}

/**
 * Delete one flagged room message.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.messageId
 * @returns {Promise<object>}
 */
export function deleteReviewedFlaggedRoomMessage(input) {
	return reviewFlaggedMessage({
		...input,
		modelAction: MessageFlagsModel.deleteFlaggedMessage,
		activityAction: CHAT_ROOM_ACTIVITY_ACTIONS.FLAGGED_MESSAGE_DELETED,
	});
}

export default {
	deleteReviewedFlaggedRoomMessage,
	listRoomFlagReviewQueue,
	markRoomMessageFlagsSafe,
	ROOM_FLAG_REVIEW_RESULT,
};
