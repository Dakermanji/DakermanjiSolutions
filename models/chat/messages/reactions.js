//! models/chat/messages/reactions.js

import pool, { queryRows } from '../../../config/database.js';

/**
 * Add one reaction to a message.
 *
 * @param {object} reaction
 * @param {string} reaction.messageId
 * @param {string} reaction.userId
 * @param {string} reaction.reaction
 * @returns {Promise<object|null>}
 */
export async function addMessageReaction({
	messageId,
	userId,
	reaction,
}) {
	const q = `
		INSERT INTO chat_message_reactions (
			message_id,
			user_id,
			reaction
		)
		VALUES ($1, $2, $3)
		ON CONFLICT ("message_id", "user_id", "reaction")
			DO NOTHING
		RETURNING
			id,
			message_id,
			user_id,
			reaction,
			created_at;
	`;

	const rows = await queryRows(q, [messageId, userId, reaction]);
	return rows[0] || null;
}

/**
 * Remove one reaction from a message.
 *
 * @param {object} reaction
 * @param {string} reaction.messageId
 * @param {string} reaction.userId
 * @param {string} reaction.reaction
 * @returns {Promise<object|null>}
 */
export async function removeMessageReaction({
	messageId,
	userId,
	reaction,
}) {
	const q = `
		DELETE FROM chat_message_reactions
		WHERE message_id = $1
			AND user_id = $2
			AND reaction = $3
		RETURNING
			id,
			message_id,
			user_id,
			reaction,
			created_at;
	`;

	const rows = await queryRows(q, [messageId, userId, reaction]);
	return rows[0] || null;
}

/**
 * List grouped reactions for one or more messages.
 *
 * @param {object} params
 * @param {Array<string>} params.messageIds
 * @param {string|null} [params.viewerUserId]
 * @returns {Promise<Array>}
 */
export async function listMessageReactions({
	messageIds,
	viewerUserId = null,
}) {
	if (!Array.isArray(messageIds) || messageIds.length === 0) {
		return [];
	}

	const q = `
		SELECT
			cmr.message_id,
			cmr.reaction,
			COUNT(*)::int AS reaction_count,
			BOOL_OR(cmr.user_id = $2) AS reacted_by_viewer,
			MIN(cmr.created_at) AS first_reacted_at,
			MAX(cmr.created_at) AS latest_reacted_at
		FROM chat_message_reactions cmr
		WHERE cmr.message_id = ANY($1::uuid[])
		GROUP BY
			cmr.message_id,
			cmr.reaction
		ORDER BY
			latest_reacted_at ASC,
			cmr.reaction ASC;
	`;

	return queryRows(q, [messageIds, viewerUserId]);
}


/**
 * List users who reacted with one reaction on one message.
 *
 * @param {object} params
 * @param {string} params.messageId
 * @param {string} params.reaction
 * @param {string|null} [params.viewerUserId]
 * @returns {Promise<Array>}
 */
export async function listMessageReactionUsers({
	messageId,
	reaction,
	viewerUserId = null,
}) {
	const q = `
		SELECT
			cmr.message_id,
			cmr.reaction,
			cmr.user_id,
			cmr.created_at,
			cmr.user_id = $3::uuid AS is_viewer,
			u.username,
			u.email,
			u.avatar_seed
		FROM chat_message_reactions cmr
		INNER JOIN users u
			ON u.id = cmr.user_id
		WHERE cmr.message_id = $1
			AND cmr.reaction = $2
		ORDER BY
			is_viewer DESC,
			cmr.created_at ASC;
	`;

	return queryRows(q, [messageId, reaction, viewerUserId]);
}
/**
 * Toggle one reaction. Removes it when present, otherwise creates it.
 *
 * @param {object} reaction
 * @param {string} reaction.messageId
 * @param {string} reaction.userId
 * @param {string} reaction.reaction
 * @returns {Promise<object>}
 */
export async function toggleMessageReaction({
	messageId,
	userId,
	reaction,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const removedRows = await client.query(
			`
				DELETE FROM chat_message_reactions
				WHERE message_id = $1
					AND user_id = $2
					AND reaction = $3
				RETURNING
					id,
					message_id,
					user_id,
					reaction,
					created_at;
			`,
			[messageId, userId, reaction],
		);
		const removedReaction = removedRows.rows[0] || null;

		if (removedReaction) {
			await client.query('COMMIT');
			return {
				action: 'removed',
				reaction: removedReaction,
			};
		}

		const addedRows = await client.query(
			`
				INSERT INTO chat_message_reactions (
					message_id,
					user_id,
					reaction
				)
				VALUES ($1, $2, $3)
				RETURNING
					id,
					message_id,
					user_id,
					reaction,
					created_at;
			`,
			[messageId, userId, reaction],
		);

		await client.query('COMMIT');
		return {
			action: 'added',
			reaction: addedRows.rows[0],
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
