//! models/chat/messages/flags.js

import { queryRows } from '../../../config/database.js';

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
