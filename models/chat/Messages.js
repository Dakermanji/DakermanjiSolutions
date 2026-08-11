//! models/chat/Messages.js

import pool, { queryRows } from '../../config/database.js';

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
				reply_sender.email AS reply_sender_email
			FROM chat_messages cm
			INNER JOIN users u
				ON u.id = cm.sender_user_id
			LEFT JOIN chat_messages reply_message
				ON reply_message.id = cm.reply_to_message_id
				AND reply_message.conversation_id = cm.conversation_id
			LEFT JOIN users reply_sender
				ON reply_sender.id = reply_message.sender_user_id
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
			ORDER BY cm.created_at DESC, cm.id DESC
			LIMIT $2
		) recent_messages
		ORDER BY recent_messages.created_at ASC, recent_messages.id ASC;
	`;

	return queryRows(q, [conversationId, limit, viewerUserId]);
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
				reply_sender.email AS reply_sender_email
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
	]);
}

/**
 * Find one visible message in a conversation.
 *
 * @param {object} params
 * @param {string} params.conversationId
 * @param {string} params.messageId
 * @returns {Promise<object|null>}
 */
export async function findConversationMessageById({
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
		LIMIT 1;
	`;

	const rows = await queryRows(q, [conversationId, messageId]);

	return rows[0] || null;
}

/**
 * Create a chat message and update the conversation's last message pointer.
 *
 * @param {object} message
 * @param {string} message.conversationId
 * @param {string} message.senderUserId
 * @param {string} message.body
 * @returns {Promise<object>}
 */
export async function createConversationMessage({
	conversationId,
	senderUserId,
	body,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const messageRows = await client.query(
			`
				INSERT INTO chat_messages (
					conversation_id,
					sender_user_id,
					body
				)
				VALUES ($1, $2, $3)
				RETURNING id;
			`,
			[conversationId, senderUserId, body],
		);
		const messageId = messageRows.rows[0].id;

		await client.query(
			`
				UPDATE chat_conversations
				SET
					last_message_id = $2,
					updated_at = NOW()
				WHERE id = $1;
			`,
			[conversationId, messageId],
		);

		await client.query(
			`
				UPDATE chat_conversation_members
				SET
					last_read_message_id = $3,
					updated_at = NOW()
				WHERE conversation_id = $1
					AND user_id = $2;
			`,
			[conversationId, senderUserId, messageId],
		);

		const messageRowsWithSender = await client.query(
			`
				SELECT
					cm.id,
					cm.conversation_id,
					cm.sender_user_id,
					cm.reply_to_message_id,
					cm.body,
					cm.edited_at,
					cm.created_at,
					cm.updated_at,
					0::int AS pending_flag_count,
					false AS flagged_by_viewer,
					u.username AS sender_username,
					u.email AS sender_email,
					u.avatar_seed AS sender_avatar_seed,
					u.country_code AS sender_country_code,
					NULL::uuid AS reply_message_id,
					NULL::text AS reply_body,
					NULL::timestamptz AS reply_deleted_at,
					NULL::uuid AS reply_sender_user_id,
					NULL::varchar AS reply_sender_username,
					NULL::varchar AS reply_sender_email
				FROM chat_messages cm
				INNER JOIN users u
					ON u.id = cm.sender_user_id
				WHERE cm.id = $1
				LIMIT 1;
			`,
			[messageId],
		);
		const message = messageRowsWithSender.rows[0];

		await client.query('COMMIT');
		return message;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Flag a message for room owner/admin review.
 *
 * @param {object} flag
 * @param {string} flag.conversationId
 * @param {string} flag.messageId
 * @param {string} flag.flaggedByUserId
 * @returns {Promise<object|null>}
 */
export async function createMessageFlag({
	conversationId,
	messageId,
	flaggedByUserId,
}) {
	const q = `
		WITH flaggable_message AS (
			SELECT
				cm.id,
				cm.conversation_id,
				cm.sender_user_id
			FROM chat_messages cm
			WHERE cm.id = $2
				AND cm.conversation_id = $1
				AND cm.sender_user_id <> $3
				AND cm.deleted_at IS NULL
			LIMIT 1
		),
		inserted_flag AS (
			INSERT INTO chat_message_flags (
				message_id,
				conversation_id,
				flagged_by_user_id
			)
			SELECT
				flaggable_message.id,
				flaggable_message.conversation_id,
				$3
			FROM flaggable_message
			ON CONFLICT ("message_id", "flagged_by_user_id")
				DO NOTHING
			RETURNING
				id,
				message_id,
				conversation_id,
				flagged_by_user_id,
				status,
				created_at
		)
		SELECT
			inserted_flag.id,
			inserted_flag.message_id,
			inserted_flag.conversation_id,
			flaggable_message.sender_user_id,
			inserted_flag.flagged_by_user_id,
			inserted_flag.status,
			inserted_flag.created_at,
			true AS created
		FROM inserted_flag
		CROSS JOIN flaggable_message
		UNION ALL
		SELECT
			cmf.id,
			cmf.message_id,
			cmf.conversation_id,
			flaggable_message.sender_user_id,
			cmf.flagged_by_user_id,
			cmf.status,
			cmf.created_at,
			false AS created
		FROM chat_message_flags cmf
		INNER JOIN flaggable_message
			ON flaggable_message.id = cmf.message_id
		WHERE cmf.flagged_by_user_id = $3
			AND cmf.status = 'pending'
			AND NOT EXISTS (SELECT 1 FROM inserted_flag)
		LIMIT 1;
	`;

	const rows = await queryRows(q, [
		conversationId,
		messageId,
		flaggedByUserId,
	]);

	return rows[0] || null;
}

/**
 * Edit a message owned by one sender inside the allowed time window.
 *
 * @param {object} message
 * @param {string} message.conversationId
 * @param {string} message.messageId
 * @param {string} message.senderUserId
 * @param {string} message.body
 * @param {number} message.windowMs
 * @returns {Promise<object|null>}
 */
export async function updateOwnConversationMessage({
	conversationId,
	messageId,
	senderUserId,
	body,
	windowMs,
}) {
	const q = `
		WITH editable_message AS (
			SELECT cm.id
			FROM chat_messages cm
			WHERE cm.id = $2
				AND cm.conversation_id = $1
				AND cm.sender_user_id = $3
				AND cm.deleted_at IS NULL
				AND cm.created_at >= NOW() - ($5::int * INTERVAL '1 millisecond')
				AND NOT EXISTS (
					SELECT 1
					FROM chat_message_flags cmf
					WHERE cmf.message_id = cm.id
						AND cmf.status = 'pending'
				)
			LIMIT 1
		),
		updated_message AS (
			UPDATE chat_messages cm
			SET
				body = $4,
				edited_at = NOW(),
				updated_at = NOW()
			FROM editable_message
			WHERE cm.id = editable_message.id
			RETURNING
				cm.id,
				cm.conversation_id,
				cm.sender_user_id,
				cm.reply_to_message_id,
				cm.body,
				cm.edited_at,
				cm.created_at,
				cm.updated_at
		)
		SELECT
			updated_message.id,
			updated_message.conversation_id,
			updated_message.sender_user_id,
			updated_message.reply_to_message_id,
			updated_message.body,
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
			reply_sender.email AS reply_sender_email
		FROM updated_message
		INNER JOIN users u
			ON u.id = updated_message.sender_user_id
		LEFT JOIN chat_messages reply_message
			ON reply_message.id = updated_message.reply_to_message_id
			AND reply_message.conversation_id = updated_message.conversation_id
		LEFT JOIN users reply_sender
			ON reply_sender.id = reply_message.sender_user_id;
	`;

	const rows = await queryRows(q, [
		conversationId,
		messageId,
		senderUserId,
		body,
		windowMs,
	]);

	return rows[0] || null;
}

/**
 * Soft-delete a message owned by one sender inside the allowed time window.
 *
 * @param {object} message
 * @param {string} message.conversationId
 * @param {string} message.messageId
 * @param {string} message.senderUserId
 * @param {number} message.windowMs
 * @returns {Promise<object|null>}
 */
export async function deleteOwnConversationMessage({
	conversationId,
	messageId,
	senderUserId,
	windowMs,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const deletedRows = await client.query(
			`
				WITH deletable_message AS (
					SELECT cm.id
					FROM chat_messages cm
					WHERE cm.id = $2
						AND cm.conversation_id = $1
						AND cm.sender_user_id = $3
						AND cm.deleted_at IS NULL
						AND cm.created_at >= NOW() - ($4::int * INTERVAL '1 millisecond')
						AND NOT EXISTS (
							SELECT 1
							FROM chat_message_flags cmf
							WHERE cmf.message_id = cm.id
								AND cmf.status = 'pending'
						)
					LIMIT 1
				)
				UPDATE chat_messages cm
				SET
					deleted_at = NOW(),
					updated_at = NOW()
				FROM deletable_message
				WHERE cm.id = deletable_message.id
				RETURNING
					cm.id,
					cm.conversation_id;
			`,
			[
				conversationId,
				messageId,
				senderUserId,
				windowMs,
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
	findRecentConversationMessages,
	findOlderConversationMessages,
	findConversationMessageById,
	createConversationMessage,
	createMessageFlag,
	updateOwnConversationMessage,
	deleteOwnConversationMessage,
};
