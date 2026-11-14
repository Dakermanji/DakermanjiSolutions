import assert from 'node:assert/strict';
import { test } from 'node:test';
import pg from 'pg';
import pool from '../../config/database.js';
import { createConversationMessage } from '../../models/chat/messages/writes.js';

const conversationId = '00000000-0000-4000-8000-000000000001';
const senderUserId = '00000000-0000-4000-8000-000000000002';
const clientMessageId = '00000000-0000-4000-8000-000000000003';

test('the same message ID creates one stored message and rejects changed content', {
	skip: !process.env.CHAT_TEST_DATABASE_URL && 'Set CHAT_TEST_DATABASE_URL to run PostgreSQL fixtures',
}, async () => {
	const client = new pg.Client({ connectionString: process.env.CHAT_TEST_DATABASE_URL });
	await client.connect();
	const originalConnect = pool.connect;
	try {
		await client.query(`
			CREATE TEMP TABLE users (
				id uuid PRIMARY KEY, username text, email text, avatar_seed text, country_code text
			);
			CREATE TEMP TABLE chat_conversations (
				id uuid PRIMARY KEY, last_message_id uuid, updated_at timestamptz
			);
			CREATE TEMP TABLE chat_conversation_members (
				conversation_id uuid, user_id uuid, last_read_message_id uuid, updated_at timestamptz
			);
			CREATE TEMP TABLE chat_messages (
				id uuid PRIMARY KEY, conversation_id uuid, sender_user_id uuid,
				reply_to_message_id uuid, body text, moderation_status text,
				moderation_reason text, reviewed_by_user_id uuid, reviewed_at timestamptz,
				edited_at timestamptz, deleted_at timestamptz,
				created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
			);
			CREATE TEMP TABLE chat_message_mentions (message_id uuid, mentioned_user_id uuid);
		`);
		await client.query('INSERT INTO users (id, username) VALUES ($1, $2)', [senderUserId, 'sender']);
		await client.query('INSERT INTO chat_conversations (id) VALUES ($1)', [conversationId]);
		await client.query(
			'INSERT INTO chat_conversation_members (conversation_id, user_id) VALUES ($1, $2)',
			[conversationId, senderUserId],
		);
		pool.connect = async () => ({
			query: (...args) => client.query(...args),
			release() {},
		});

		const input = { conversationId, senderUserId, clientMessageId, body: 'hello' };
		const first = await createConversationMessage(input);
		const retry = await createConversationMessage(input);
		const changed = await createConversationMessage({ ...input, body: 'different' });
		const stored = await client.query('SELECT id FROM chat_messages');
		const conversation = await client.query(
			'SELECT last_message_id FROM chat_conversations WHERE id = $1', [conversationId],
		);

		assert.equal(first.created, true);
		assert.equal(retry.created, false);
		assert.equal(first.message.id, clientMessageId);
		assert.equal(retry.message.id, clientMessageId);
		assert.equal(changed, null);
		assert.equal(stored.rowCount, 1);
		assert.equal(conversation.rows[0].last_message_id, clientMessageId);
	} finally {
		pool.connect = originalConnect;
		await client.end();
	}
});
