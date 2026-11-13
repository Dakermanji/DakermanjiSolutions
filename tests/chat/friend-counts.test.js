import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import pg from 'pg';

const modelSource = readFileSync(
	new URL('../../models/chat/conversations/friends.js', import.meta.url),
	'utf8',
);

function modelQuery(functionName) {
	const start = modelSource.indexOf(`export async function ${functionName}(`);
	assert.notEqual(start, -1, `${functionName} exists`);
	const match = modelSource.slice(start).match(/const q = `([\s\S]*?)`;/);
	assert.ok(match, `${functionName} has a SQL query`);
	return match[1];
}

const friendListQuery = modelQuery('findFriendConversationsForUser');
const friendCountQuery = modelQuery('countFriendConversationSectionForUser');

const id = (prefix, number) => `${prefix}0000000-0000-0000-0000-${String(number).padStart(12, '0')}`;
const viewer = id('0', 1);
const friendA = id('0', 2);
const friendB = id('0', 3);
const blockedFriend = id('0', 4);
const oneWayFriend = id('0', 5);

async function createFixture(client) {
	await client.query('BEGIN');
	await client.query(`
		CREATE TEMP TABLE users (
			id uuid PRIMARY KEY, username text, email text, avatar_seed text, country_code text
		) ON COMMIT DROP;
		CREATE TEMP TABLE chat_conversations (
			id uuid PRIMARY KEY, type text, last_message_id uuid, updated_at timestamptz
		) ON COMMIT DROP;
		CREATE TEMP TABLE chat_direct_conversations (
			conversation_id uuid, user_one_id uuid, user_two_id uuid
		) ON COMMIT DROP;
		CREATE TEMP TABLE chat_conversation_members (
			conversation_id uuid, user_id uuid, last_read_message_id uuid
		) ON COMMIT DROP;
		CREATE TEMP TABLE chat_messages (
			id uuid PRIMARY KEY, conversation_id uuid, sender_user_id uuid,
			created_at timestamptz, deleted_at timestamptz
		) ON COMMIT DROP;
		CREATE TEMP TABLE user_follows (follower_id uuid, followee_id uuid) ON COMMIT DROP;
		CREATE TEMP TABLE user_blocks (blocker_id uuid, blocked_id uuid) ON COMMIT DROP;
	`);
	const users = [viewer, friendA, friendB, blockedFriend, oneWayFriend];
	for (const [index, userId] of users.entries()) {
		await client.query(
			'INSERT INTO users (id, username, email) VALUES ($1, $2, $3)',
			[userId, `user${index}`, `user${index}@example.test`],
		);
	}
	for (const [index, friendId] of users.slice(1).entries()) {
		const conversationId = id('1', index + 1);
		await client.query(
			'INSERT INTO chat_conversations (id, type, updated_at) VALUES ($1, $2, NOW())',
			[conversationId, 'friend'],
		);
		await client.query(
			'INSERT INTO chat_direct_conversations VALUES ($1, $2, $3)',
			[conversationId, viewer, friendId],
		);
		await client.query(
			'INSERT INTO chat_conversation_members VALUES ($1, $2, $3)',
			[conversationId, viewer, index === 0 ? id('2', 1) : null],
		);
		await client.query(
			'INSERT INTO user_follows VALUES ($1, $2)',
			[viewer, friendId],
		);
		if (friendId !== oneWayFriend) {
			await client.query(
				'INSERT INTO user_follows VALUES ($1, $2)',
				[friendId, viewer],
			);
		}
	}
	await client.query('INSERT INTO user_blocks VALUES ($1, $2)', [blockedFriend, viewer]);
	const messages = [
		[id('2', 1), id('1', 1), friendA, '2026-01-01T10:00:00Z', null],
		[id('2', 2), id('1', 1), friendA, '2026-01-01T11:00:00Z', null],
		[id('2', 3), id('1', 1), friendA, '2026-01-01T12:00:00Z', null],
		[id('2', 4), id('1', 1), friendA, '2026-01-01T13:00:00Z', '2026-01-02T00:00:00Z'],
		[id('2', 5), id('1', 1), viewer, '2026-01-01T14:00:00Z', null],
		[id('2', 6), id('1', 2), friendB, '2026-01-01T11:00:00Z', null],
		[id('2', 7), id('1', 3), blockedFriend, '2026-01-01T11:00:00Z', null],
		[id('2', 8), id('1', 4), oneWayFriend, '2026-01-01T11:00:00Z', null],
	];
	for (const message of messages) {
		await client.query('INSERT INTO chat_messages VALUES ($1, $2, $3, $4, $5)', message);
	}
}

async function assertCountsMatch(client, expected) {
	const params = [viewer, 'friend'];
	const [list, counts] = await Promise.all([
		client.query(friendListQuery, params),
		client.query(friendCountQuery, params),
	]);
	const actual = {
		conversationCount: counts.rows[0].conversation_count,
		unreadCount: counts.rows[0].unread_count,
	};
	assert.deepEqual(actual, expected);
	assert.equal(actual.conversationCount, list.rows.length);
	assert.equal(
		actual.unreadCount,
		list.rows.reduce((sum, row) => sum + row.unread_count, 0),
	);
}

test('friend section counts match the visible list and its unread totals', {
	skip: !process.env.CHAT_TEST_DATABASE_URL && 'Set CHAT_TEST_DATABASE_URL to run PostgreSQL fixtures',
}, async () => {
	const client = new pg.Client({ connectionString: process.env.CHAT_TEST_DATABASE_URL });
	await client.connect();
	try {
		await createFixture(client);
		await assertCountsMatch(client, { conversationCount: 2, unreadCount: 3 });
		await client.query('DELETE FROM user_follows WHERE follower_id = $1 AND followee_id = $2', [friendB, viewer]);
		await assertCountsMatch(client, { conversationCount: 1, unreadCount: 2 });
		await client.query('INSERT INTO user_blocks VALUES ($1, $2)', [viewer, friendA]);
		await assertCountsMatch(client, { conversationCount: 0, unreadCount: 0 });
	} finally {
		await client.query('ROLLBACK').catch(() => {});
		await client.end();
	}
});
