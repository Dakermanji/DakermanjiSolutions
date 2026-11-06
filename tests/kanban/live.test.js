import assert from 'node:assert/strict';
import test from 'node:test';
import {
	getKanbanProjectRoom,
	registerKanbanSocketHandlers,
} from '../../services/kanban/live.js';

const PROJECT_ID = 'b2d6c1a8-7f44-4a0e-9d27-6b1f8f11c901';

function createSocket(userId = 'member-user') {
	const handlers = new Map();
	const rooms = new Set();
	const socket = {
		data: { userId },
		on: (event, handler) => handlers.set(event, handler),
		join: async (room) => rooms.add(room),
		leave: async (room) => rooms.delete(room),
	};

	return {
		socket,
		handlers,
		rooms,
		send: (event, ...args) => handlers.get(event)(...args),
	};
}

test('joins a project room after confirming the authenticated socket user is a member', async () => {
	const h = createSocket();
	const calls = [];
	registerKanbanSocketHandlers(h.socket, {
		findProject: async (...args) => {
			calls.push(args);
			return { id: PROJECT_ID };
		},
	});
	let reply;

	await h.send('kanban:project:join', {
		projectId: PROJECT_ID,
		userId: 'spoofed-user',
	}, (result) => { reply = result; });

	assert.deepEqual(calls, [[PROJECT_ID, 'member-user']]);
	assert.deepEqual([...h.rooms], [getKanbanProjectRoom(PROJECT_ID)]);
	assert.deepEqual(reply, { ok: true });
});

test('rejects a user who is not a current project member and clears stale room access', async () => {
	const h = createSocket();
	const room = getKanbanProjectRoom(PROJECT_ID);
	h.rooms.add(room);
	registerKanbanSocketHandlers(h.socket, { findProject: async () => null });
	let reply;

	await h.send('kanban:project:join', { projectId: PROJECT_ID }, (result) => { reply = result; });

	assert.equal(h.rooms.has(room), false);
	assert.deepEqual(reply, { ok: false });
});

test('rejects malformed project IDs without querying membership', async () => {
	const h = createSocket();
	let queried = false;
	registerKanbanSocketHandlers(h.socket, {
		findProject: async () => { queried = true; return { id: PROJECT_ID }; },
	});
	let reply;

	await h.send('kanban:project:join', { projectId: 'not-a-uuid' }, (result) => { reply = result; });

	assert.equal(queried, false);
	assert.deepEqual([...h.rooms], []);
	assert.deepEqual(reply, { ok: false });
});

test('leaves a valid project room when the client requests it', async () => {
	const h = createSocket();
	const room = getKanbanProjectRoom(PROJECT_ID);
	h.rooms.add(room);
	registerKanbanSocketHandlers(h.socket);
	let reply;

	await h.send('kanban:project:leave', { projectId: PROJECT_ID }, (result) => { reply = result; });

	assert.equal(h.rooms.has(room), false);
	assert.deepEqual(reply, { ok: true });
});
