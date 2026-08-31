//! models/chat/messages/reads.js

import { queryRows } from '../../../config/database.js';

/**
 * List recent messages for one conversation in display order.
 *
 * @param {string} conversationId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function findRecentConversationMessages(
	conversationId,
	limit = 50,
	viewerUserId = null,
	canViewPendingModeration = false,
) {
	const q = `
		SELECT *
		FROM (
			SELECT
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
				cm.updated_at,
				COALESCE(flag_totals.pending_flag_count, 0)::int AS pending_flag_count,
				(viewer_flag.id IS NOT NULL) AS flagged_by_viewer,
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
			FROM chat_messages cm
			INNER JOIN users u
				ON u.id = cm.sender_user_id
			LEFT JOIN chat_messages reply_message
				ON reply_message.id = cm.reply_to_message_id
				AND reply_message.conversation_id = cm.conversation_id
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
				WHERE cmm.message_id = cm.id
			) mention_list
				ON true
			LEFT JOIN LATERAL (
				SELECT COUNT(*) AS pending_flag_count
				FROM chat_message_flags cmf
				WHERE cmf.message_id = cm.id
					AND cmf.status = 'pending'
			) flag_totals
				ON true
			LEFT JOIN chat_message_flags viewer_flag
				ON viewer_flag.message_id = cm.id
				AND viewer_flag.flagged_by_user_id = $3
				AND viewer_flag.status = 'pending'
			WHERE cm.conversation_id = $1
				AND cm.deleted_at IS NULL
				AND (
					cm.moderation_status = 'visible'
					OR cm.sender_user_id = $3
					OR $4::boolean
				)
			ORDER BY cm.created_at DESC, cm.id DESC
			LIMIT $2
		) recent_messages
		ORDER BY recent_messages.created_at ASC, recent_messages.id ASC;
	`;

	return queryRows(q, [
		conversationId,
		limit,
		viewerUserId,
		canViewPendingModeration,
	]);
}

/**
 * List messages older than one cursor in display order.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.beforeId
 * @param {number} params.limit
 * @returns {Promise<Array>}
 */
export async function findOlderConversationMessages({
	conversationId,
	beforeId,
	limit = 50,
	viewerUserId = null,
	canViewPendingModeration = false,
}) {
	const q = `
		WITH cursor_message AS (
			SELECT id, created_at
			FROM chat_messages
			WHERE conversation_id = $1
				AND id = $2
			LIMIT 1
		)
		SELECT *
		FROM (
			SELECT
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
				cm.updated_at,
				COALESCE(flag_totals.pending_flag_count, 0)::int AS pending_flag_count,
				(viewer_flag.id IS NOT NULL) AS flagged_by_viewer,
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
			FROM chat_messages cm
			CROSS JOIN cursor_message cursor
			INNER JOIN users u
				ON u.id = cm.sender_user_id
			LEFT JOIN chat_messages reply_message
				ON reply_message.id = cm.reply_to_message_id
				AND reply_message.conversation_id = cm.conversation_id
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
				WHERE cmm.message_id = cm.id
			) mention_list
				ON true
			LEFT JOIN LATERAL (
				SELECT COUNT(*) AS pending_flag_count
				FROM chat_message_flags cmf
				WHERE cmf.message_id = cm.id
					AND cmf.status = 'pending'
			) flag_totals
				ON true
			LEFT JOIN chat_message_flags viewer_flag
				ON viewer_flag.message_id = cm.id
				AND viewer_flag.flagged_by_user_id = $4
				AND viewer_flag.status = 'pending'
			WHERE cm.conversation_id = $1
				AND cm.deleted_at IS NULL
				AND (
					cm.moderation_status = 'visible'
					OR cm.sender_user_id = $4
					OR $5::boolean
				)
				AND (
					cm.created_at < cursor.created_at
					OR (
						cm.created_at = cursor.created_at
						AND cm.id < cursor.id
					)
				)
			ORDER BY cm.created_at DESC, cm.id DESC
			LIMIT $3
		) older_messages
		ORDER BY older_messages.created_at ASC, older_messages.id ASC;
	`;

	return queryRows(q, [
		conversationId,
		beforeId,
		limit,
		viewerUserId,
		canViewPendingModeration,
	]);
}

/**
 * Find one readable message in a conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.messageId
 * @param {string|null} [params.viewerUserId]
 * @param {boolean} [params.canViewPendingModeration]
 * @returns {Promise<object|null>}
 */
export async function findConversationMessageById({
	conversationId,
	messageId,
	viewerUserId = null,
	canViewPendingModeration = false,
}) {
	const q = `
		SELECT
			cm.id,
			cm.conversation_id,
			cm.sender_user_id,
			cm.moderation_status,
			cm.moderation_reason,
			cm.reviewed_by_user_id,
			cm.reviewed_at
		FROM chat_messages cm
		WHERE cm.conversation_id = $1
			AND cm.id = $2
			AND cm.deleted_at IS NULL
			AND (
				cm.moderation_status = 'visible'
				OR cm.sender_user_id = $3
				OR $4::boolean
			)
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		conversationId,
		messageId,
		viewerUserId,
		canViewPendingModeration,
	]);

	return rows[0] || null;
}

/**
 * Find one replyable message inside the same conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.messageId
 * @returns {Promise<object|null>}
 */
export async function findReplyableConversationMessage({
	conversationId,
	messageId,
}) {
	const q = `
		SELECT
			cm.id,
			cm.conversation_id
		FROM chat_messages cm
		WHERE cm.conversation_id = $1
			AND cm.id = $2
			AND cm.deleted_at IS NULL
			AND cm.moderation_status = 'visible'
		LIMIT 1;
	`;

	const rows = await queryRows(q, [conversationId, messageId]);

	return rows[0] || null;
}
