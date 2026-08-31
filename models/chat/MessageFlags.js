//! models/chat/MessageFlags.js

import pool, { queryRows } from '../../config/database.js';
import {
	CHAT_MESSAGE_FLAG_STATUSES,
	CHAT_MESSAGE_MODERATION_REASONS,
	CHAT_MESSAGE_MODERATION_STATUSES,
} from '../../constants/chat.js';

const DEFAULT_FLAG_REVIEW_LIMIT = 20;
const MAX_FLAG_REVIEW_LIMIT = 100;

const FLAG_REVIEW_ORDERS = Object.freeze({
	NEWEST: 'newest',
	OLDEST: 'oldest',
	MOST_FLAGGED: 'most_flagged',
});

function normalizeLimit(limit) {
	const normalized = Number.parseInt(limit, 10);

	if (!Number.isInteger(normalized) || normalized < 1) {
		return DEFAULT_FLAG_REVIEW_LIMIT;
	}

	return Math.min(normalized, MAX_FLAG_REVIEW_LIMIT);
}

function getFlagReviewOrderSQL(order) {
	switch (order) {
		case FLAG_REVIEW_ORDERS.OLDEST:
			return 'first_flagged_at ASC, message_created_at ASC, message_id ASC';
		case FLAG_REVIEW_ORDERS.MOST_FLAGGED:
			return 'flag_count DESC, latest_flagged_at DESC, message_created_at DESC, message_id DESC';
		case FLAG_REVIEW_ORDERS.NEWEST:
		default:
			return 'latest_flagged_at DESC, message_created_at DESC, message_id DESC';
	}
}

/**
 * List messages in one room conversation with pending flags.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {'newest'|'oldest'|'most_flagged'} [input.order]
 * @param {number} [input.limit]
 * @returns {Promise<Array>}
 */
export async function listPendingRoomMessageFlags({
	conversationId,
	order = FLAG_REVIEW_ORDERS.NEWEST,
	limit = DEFAULT_FLAG_REVIEW_LIMIT,
}) {
	const q = `
		SELECT *
		FROM (
			SELECT
				cm.id AS message_id,
				cm.conversation_id,
				cm.sender_user_id,
				cm.body,
				cm.created_at AS message_created_at,
				cm.updated_at AS message_updated_at,
				u.username AS sender_username,
				u.email AS sender_email,
				u.avatar_seed AS sender_avatar_seed,
				u.country_code AS sender_country_code,
				COUNT(cmf.id)::int AS flag_count,
				MIN(cmf.created_at) AS first_flagged_at,
				MAX(cmf.created_at) AS latest_flagged_at
			FROM chat_messages cm
			INNER JOIN chat_message_flags cmf
				ON cmf.message_id = cm.id
				AND cmf.status = $2::chat_message_flag_status
			INNER JOIN users u
				ON u.id = cm.sender_user_id
			WHERE cm.conversation_id = $1
				AND cm.deleted_at IS NULL
			GROUP BY
				cm.id,
				cm.conversation_id,
				cm.sender_user_id,
				cm.body,
				cm.created_at,
				cm.updated_at,
				u.username,
				u.email,
				u.avatar_seed,
				u.country_code
		) pending_flags
		ORDER BY ${getFlagReviewOrderSQL(order)}
		LIMIT $3;
	`;

	return queryRows(q, [
		conversationId,
		CHAT_MESSAGE_FLAG_STATUSES.PENDING,
		normalizeLimit(limit),
	]);
}

/**
 * List messages in one room conversation pending automatic moderation review.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {'newest'|'oldest'} [input.order]
 * @param {number} [input.limit]
 * @returns {Promise<Array>}
 */
export async function listPendingRoomMessageModeration({
	conversationId,
	order = FLAG_REVIEW_ORDERS.NEWEST,
	limit = DEFAULT_FLAG_REVIEW_LIMIT,
}) {
	const sortDirection = order === FLAG_REVIEW_ORDERS.OLDEST ? 'ASC' : 'DESC';
	const q = `
		SELECT
			cm.id AS message_id,
			cm.conversation_id,
			cm.sender_user_id,
			cm.body,
			cm.moderation_status,
			cm.moderation_reason,
			cm.created_at AS message_created_at,
			cm.updated_at AS message_updated_at,
			u.username AS sender_username,
			u.email AS sender_email,
			u.avatar_seed AS sender_avatar_seed,
			u.country_code AS sender_country_code
		FROM chat_messages cm
		INNER JOIN users u
			ON u.id = cm.sender_user_id
		WHERE cm.conversation_id = $1
			AND cm.deleted_at IS NULL
			AND cm.moderation_status = $2::chat_message_moderation_status
		ORDER BY cm.created_at ${sortDirection}, cm.id ${sortDirection}
		LIMIT $3;
	`;

	return queryRows(q, [
		conversationId,
		CHAT_MESSAGE_MODERATION_STATUSES.PENDING_REVIEW,
		normalizeLimit(limit),
	]);
}

/**
 * Approve one pending moderated message.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.reviewedByUserId
 * @returns {Promise<object|null>}
 */
export async function approvePendingMessage({
	conversationId,
	messageId,
	reviewedByUserId,
}) {
	const q = `
		WITH updated_message AS (
			UPDATE chat_messages cm
			SET
				moderation_status = $4::chat_message_moderation_status,
				reviewed_by_user_id = $3,
				reviewed_at = NOW(),
				updated_at = NOW()
			WHERE cm.id = $2
				AND cm.conversation_id = $1
				AND cm.deleted_at IS NULL
				AND cm.moderation_status = $5::chat_message_moderation_status
			RETURNING
				cm.id,
				cm.conversation_id,
				cm.sender_user_id,
				cm.reply_to_message_id,
				cm.body,
				cm.moderation_status,
				cm.moderation_reason,
				cm.reviewed_by_user_id,
				cm.reviewed_at,
				cm.edited_at,
				cm.created_at,
				cm.updated_at
		)
		SELECT
			updated_message.id AS message_id,
			updated_message.id,
			updated_message.conversation_id,
			updated_message.sender_user_id,
			updated_message.reply_to_message_id,
			updated_message.body,
			updated_message.moderation_status,
			updated_message.moderation_reason,
			updated_message.reviewed_by_user_id,
			updated_message.reviewed_at,
			updated_message.edited_at,
			updated_message.created_at,
			updated_message.updated_at,
			0::int AS pending_flag_count,
			false AS flagged_by_viewer,
			u.username AS sender_username,
			u.email AS sender_email,
			u.avatar_seed AS sender_avatar_seed,
			u.country_code AS sender_country_code,
			reply_message.id AS reply_message_id,
			reply_message.body AS reply_body,
			reply_message.deleted_at AS reply_deleted_at,
			reply_sender.id AS reply_sender_user_id,
			reply_sender.username AS reply_sender_username,
			reply_sender.email AS reply_sender_email,
			COALESCE(mention_list.mentions, '[]'::json) AS mentions
		FROM updated_message
		INNER JOIN users u
			ON u.id = updated_message.sender_user_id
		LEFT JOIN chat_messages reply_message
			ON reply_message.id = updated_message.reply_to_message_id
			AND reply_message.conversation_id = updated_message.conversation_id
		LEFT JOIN users reply_sender
			ON reply_sender.id = reply_message.sender_user_id
		LEFT JOIN LATERAL (
			SELECT COALESCE(
				JSON_AGG(
					JSON_BUILD_OBJECT(
						'userId', mention_user.id,
						'username', mention_user.username,
						'email', mention_user.email
					)
					ORDER BY mention_user.username
				),
				'[]'::json
			) AS mentions
			FROM chat_message_mentions cmm
			INNER JOIN users mention_user
				ON mention_user.id = cmm.mentioned_user_id
			WHERE cmm.message_id = updated_message.id
		) mention_list
			ON true;
	`;

	const rows = await queryRows(q, [
		conversationId,
		messageId,
		reviewedByUserId,
		CHAT_MESSAGE_MODERATION_STATUSES.VISIBLE,
		CHAT_MESSAGE_MODERATION_STATUSES.PENDING_REVIEW,
	]);

	return rows[0] || null;
}

/**
 * Hide one pending moderated message.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.reviewedByUserId
 * @returns {Promise<object|null>}
 */
export async function hidePendingMessage({
	conversationId,
	messageId,
	reviewedByUserId,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const hiddenRows = await client.query(
			`
				WITH updated_message AS (
					UPDATE chat_messages cm
					SET
						moderation_status = $4::chat_message_moderation_status,
						moderation_reason = $6::chat_message_moderation_reason,
						reviewed_by_user_id = $3,
						reviewed_at = NOW(),
						deleted_at = NOW(),
						updated_at = NOW()
					WHERE cm.id = $2
						AND cm.conversation_id = $1
						AND cm.deleted_at IS NULL
						AND cm.moderation_status = $5::chat_message_moderation_status
					RETURNING
						cm.id,
						cm.conversation_id,
						cm.sender_user_id,
						cm.body,
						cm.moderation_status,
						cm.moderation_reason,
						cm.reviewed_by_user_id,
						cm.reviewed_at
				)
				SELECT
					updated_message.id AS message_id,
					updated_message.conversation_id,
					updated_message.sender_user_id,
					updated_message.body,
					updated_message.moderation_status,
					updated_message.moderation_reason,
					updated_message.reviewed_by_user_id,
					updated_message.reviewed_at,
					u.username AS sender_username,
					u.email AS sender_email,
					u.avatar_seed AS sender_avatar_seed,
					u.country_code AS sender_country_code
				FROM updated_message
				INNER JOIN users u
					ON u.id = updated_message.sender_user_id;
			`,
			[
				conversationId,
				messageId,
				reviewedByUserId,
				CHAT_MESSAGE_MODERATION_STATUSES.HIDDEN,
				CHAT_MESSAGE_MODERATION_STATUSES.PENDING_REVIEW,
				CHAT_MESSAGE_MODERATION_REASONS.ADMIN_DELETED,
			],
		);
		const hiddenMessage = hiddenRows.rows[0] || null;

		if (!hiddenMessage) {
			await client.query('ROLLBACK');
			return null;
		}

		await client.query(
			`
				UPDATE chat_conversations cc
				SET
					last_message_id = (
						SELECT cm.id
						FROM chat_messages cm
						WHERE cm.conversation_id = cc.id
							AND cm.deleted_at IS NULL
							AND cm.moderation_status = $3::chat_message_moderation_status
						ORDER BY cm.created_at DESC, cm.id DESC
						LIMIT 1
					),
					updated_at = NOW()
				WHERE cc.id = $1
					AND cc.last_message_id = $2;
			`,
			[
				conversationId,
				messageId,
				CHAT_MESSAGE_MODERATION_STATUSES.VISIBLE,
			],
		);

		await client.query('COMMIT');
		return hiddenMessage;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Mark all pending flags for one message as safe.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.reviewedByUserId
 * @returns {Promise<object|null>}
 */
export async function markMessageFlagsSafe({
	conversationId,
	messageId,
	reviewedByUserId,
}) {
	const q = `
		WITH reviewable_message AS (
			SELECT
				cm.id,
				cm.conversation_id,
				cm.sender_user_id,
				cm.body,
				u.username AS sender_username,
				u.email AS sender_email,
				u.avatar_seed AS sender_avatar_seed,
				u.country_code AS sender_country_code
			FROM chat_messages cm
			INNER JOIN users u
				ON u.id = cm.sender_user_id
			WHERE cm.id = $2
				AND cm.conversation_id = $1
				AND cm.deleted_at IS NULL
				AND EXISTS (
					SELECT 1
					FROM chat_message_flags cmf
					WHERE cmf.message_id = cm.id
						AND cmf.status = $4::chat_message_flag_status
				)
			LIMIT 1
		),
		updated_flags AS (
			UPDATE chat_message_flags cmf
			SET
				status = $5::chat_message_flag_status,
				reviewed_by_user_id = $3,
				reviewed_at = NOW(),
				updated_at = NOW()
			FROM reviewable_message
			WHERE cmf.message_id = reviewable_message.id
				AND cmf.status = $4::chat_message_flag_status
			RETURNING cmf.id
		)
		SELECT
			reviewable_message.id AS message_id,
			reviewable_message.conversation_id,
			reviewable_message.sender_user_id,
			reviewable_message.body,
			reviewable_message.sender_username,
			reviewable_message.sender_email,
			reviewable_message.sender_avatar_seed,
			reviewable_message.sender_country_code,
			COUNT(updated_flags.id)::int AS reviewed_flag_count
		FROM reviewable_message
		INNER JOIN updated_flags
			ON true
		GROUP BY
			reviewable_message.id,
			reviewable_message.conversation_id,
			reviewable_message.sender_user_id,
			reviewable_message.body,
			reviewable_message.sender_username,
			reviewable_message.sender_email,
			reviewable_message.sender_avatar_seed,
			reviewable_message.sender_country_code;
	`;

	const rows = await queryRows(q, [
		conversationId,
		messageId,
		reviewedByUserId,
		CHAT_MESSAGE_FLAG_STATUSES.PENDING,
		CHAT_MESSAGE_FLAG_STATUSES.SAFE,
	]);

	return rows[0] || null;
}

/**
 * Soft-delete one flagged message and mark its pending flags deleted.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.messageId
 * @param {string} input.reviewedByUserId
 * @returns {Promise<object|null>}
 */
export async function deleteFlaggedMessage({
	conversationId,
	messageId,
	reviewedByUserId,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const deletedRows = await client.query(
			`
				WITH reviewable_message AS (
					SELECT
						cm.id,
						cm.conversation_id,
						cm.sender_user_id,
						cm.body,
						u.username AS sender_username,
						u.email AS sender_email,
						u.avatar_seed AS sender_avatar_seed,
						u.country_code AS sender_country_code
					FROM chat_messages cm
					INNER JOIN users u
						ON u.id = cm.sender_user_id
					WHERE cm.id = $2
						AND cm.conversation_id = $1
						AND cm.deleted_at IS NULL
						AND EXISTS (
							SELECT 1
							FROM chat_message_flags cmf
							WHERE cmf.message_id = cm.id
								AND cmf.status = $4::chat_message_flag_status
						)
					LIMIT 1
				),
				updated_message AS (
					UPDATE chat_messages cm
					SET
						deleted_at = NOW(),
						updated_at = NOW()
					FROM reviewable_message
					WHERE cm.id = reviewable_message.id
					RETURNING
						cm.id,
						cm.conversation_id,
						cm.sender_user_id,
						cm.body,
						reviewable_message.sender_username,
						reviewable_message.sender_email,
						reviewable_message.sender_avatar_seed,
						reviewable_message.sender_country_code
				),
				updated_flags AS (
					UPDATE chat_message_flags cmf
					SET
						status = $5::chat_message_flag_status,
						reviewed_by_user_id = $3,
						reviewed_at = NOW(),
						updated_at = NOW()
					FROM updated_message
					WHERE cmf.message_id = updated_message.id
						AND cmf.status = $4::chat_message_flag_status
					RETURNING cmf.id
				)
				SELECT
					updated_message.id AS message_id,
					updated_message.conversation_id,
					updated_message.sender_user_id,
					updated_message.body,
					updated_message.sender_username,
					updated_message.sender_email,
					updated_message.sender_avatar_seed,
					updated_message.sender_country_code,
					COUNT(updated_flags.id)::int AS reviewed_flag_count
				FROM updated_message
				INNER JOIN updated_flags
					ON true
				GROUP BY
					updated_message.id,
					updated_message.conversation_id,
					updated_message.sender_user_id,
					updated_message.body,
					updated_message.sender_username,
					updated_message.sender_email,
					updated_message.sender_avatar_seed,
					updated_message.sender_country_code;
			`,
			[
				conversationId,
				messageId,
				reviewedByUserId,
				CHAT_MESSAGE_FLAG_STATUSES.PENDING,
				CHAT_MESSAGE_FLAG_STATUSES.DELETED,
			],
		);
		const deletedMessage = deletedRows.rows[0] || null;

		if (!deletedMessage) {
			await client.query('ROLLBACK');
			return null;
		}

		await client.query(
			`
				UPDATE chat_conversations cc
				SET
					last_message_id = (
						SELECT cm.id
						FROM chat_messages cm
						WHERE cm.conversation_id = cc.id
							AND cm.deleted_at IS NULL
						ORDER BY cm.created_at DESC, cm.id DESC
						LIMIT 1
					),
					updated_at = NOW()
				WHERE cc.id = $1
					AND cc.last_message_id = $2;
			`,
			[conversationId, messageId],
		);

		await client.query('COMMIT');
		return deletedMessage;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export default {
	approvePendingMessage,
	deleteFlaggedMessage,
	hidePendingMessage,
	listPendingRoomMessageFlags,
	listPendingRoomMessageModeration,
	markMessageFlagsSafe,
};
