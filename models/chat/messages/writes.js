//! models/chat/messages/writes.js

import pool, { queryRows } from '../../../config/database.js';

/**
 * Create a chat message and update the conversation's last message pointer.
 *
 * @param {object} message
 * @param {string} message.conversationId
 * @param {string} message.senderUserId
 * @param {string|null} [message.replyToMessageId]
 * @param {Array<string>} [message.mentionedUserIds]
 * @param {string} message.body
 * @returns {Promise<object>}
 */
export async function createConversationMessage({
	conversationId,
	senderUserId,
	replyToMessageId = null,
	mentionedUserIds = [],
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
					reply_to_message_id,
					body
				)
				VALUES ($1, $2, $3, $4)
				RETURNING id;
			`,
			[conversationId, senderUserId, replyToMessageId, body],
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

		await createMessageMentions(client, {
			messageId,
			mentionedUserIds,
		});

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

async function createMessageMentions(client, {
	messageId,
	mentionedUserIds = [],
}) {
	const uniqueMentionedUserIds = [...new Set(
		mentionedUserIds.filter(Boolean),
	)];

	if (uniqueMentionedUserIds.length === 0) return;

	await client.query(
		`
			INSERT INTO chat_message_mentions (
				message_id,
				mentioned_user_id
			)
			SELECT $1, mentioned_user_id
			FROM UNNEST($2::uuid[]) AS mentioned_user_id
			ON CONFLICT (message_id, mentioned_user_id) DO NOTHING;
		`,
		[messageId, uniqueMentionedUserIds],
	);
}
