import {
	PRESENCE_STATUSES,
	PRESENCE_CHECK_INTERVAL_MS,
	PRESENCE_IDLE_TIMEOUT_MS,
} from '../../constants/presence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceSocketService } from '../../services/presence/live.js';
import { createPresenceState } from '../../services/presence/state.js';

function setup(storage = new Map(), overrides = {}) {
	let time = 0;
	let tick;
	let starts = 0;
	let stops = 0;
	const events = [];
	const state = createPresenceState({ now: () => time });
	const service = createPresenceSocketService(
		{
			to: (room) => ({
				emit: (event, payload) => events.push({ room, event, payload }),
			}),
		},
		{
			state,
			loadPreference: async (userId) => storage.get(userId) || PRESENCE_STATUSES.ONLINE,
			savePreference: async (userId, status) => { storage.set(userId, status); },
			...overrides,
			schedule: (callback, delay) => {
				assert.equal(delay, PRESENCE_CHECK_INTERVAL_MS);
				tick = callback;
				starts++;
				return { unref() {} };
			},
			cancel: () => {
				stops++;
			},
		},
	);
	async function connect(id, userId = 'user') {
		const handlers = new Map();
		const snapshots = [];
		const rooms = [];
		await service.register({
			id,
			data: { userId },
			join: (room) => rooms.push(room),
			emit: (event, payload) => snapshots.push({ event, payload }),
			on: (event, handler) => handlers.set(event, handler),
		});
		return {
			handlers,
			snapshots,
			rooms,
			send: (event, ...args) => handlers.get(event)(...args),
		};
	}
	return {
		state,
		service,
		events,
		connect,
		advance: (ms) => {
			time += ms;
		},
		tick: () => tick(),
		counts: () => ({ starts, stops }),
	};
}

test('sends initial snapshots, publishes inactivity once, and restores Online on activity', async () => {
	const h = setup();
	const first = await h.connect('first');
	assert.deepEqual(first.rooms, ['presence:user:user']);
	assert.deepEqual(h.events, [
		{
			room: 'presence:user:user',
			event: 'presence:changed',
			payload: { status: PRESENCE_STATUSES.ONLINE },
		},
	]);
	const second = await h.connect('second');
	assert.deepEqual(second.snapshots, [
		{
			event: 'presence:changed',
			payload: { status: PRESENCE_STATUSES.ONLINE },
		},
	]);
	assert.equal(h.events.length, 1);
	h.advance(PRESENCE_IDLE_TIMEOUT_MS);
	h.tick();
	assert.equal(h.events.at(-1).payload.status, PRESENCE_STATUSES.AWAY);
	h.tick();
	assert.equal(h.events.length, 2);
	first.send('presence:activity');
	assert.equal(h.events.at(-1).payload.status, PRESENCE_STATUSES.ONLINE);
	assert.deepEqual(h.counts(), { starts: 1, stops: 0 });
});

test('uses authenticated identity and validates manual choices and acknowledgements', async () => {
	const h = setup();
	const socket = await h.connect('tab');
	await h.connect('other-tab', 'other');
	let reply;
	await socket.send(
		'presence:set',
		{ userId: 'other', status: PRESENCE_STATUSES.BUSY },
		(value) => {
			reply = value;
		},
	);
	assert.deepEqual(reply, { ok: true, status: PRESENCE_STATUSES.BUSY });
	assert.equal(h.state.getStatus('other'), PRESENCE_STATUSES.ONLINE);
	assert.equal(h.events.at(-1).room, 'presence:user:user');
	await socket.send('presence:activity');
	h.advance(PRESENCE_IDLE_TIMEOUT_MS);
	h.tick();
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.BUSY);
	for (const payload of [
		null,
		{},
		{ status: PRESENCE_STATUSES.OFFLINE },
		{ status: {} },
	]) {
		await socket.send('presence:set', payload, (value) => {
			reply = value;
		});
		assert.deepEqual(reply, { ok: false, status: PRESENCE_STATUSES.BUSY });
	}
	await assert.doesNotReject(async () =>
		await socket.send(
			'presence:set',
			{ status: PRESENCE_STATUSES.ONLINE },
			'invalid callback',
		),
	);
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
});

test('disconnects preserve other tabs and stop the timer only after the last user leaves', async () => {
	const h = setup();
	const first = await h.connect('first');
	const second = await h.connect('second');
	const other = await h.connect('other', 'other');
	await first.send('disconnect');
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
	await second.send('disconnect');
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.OFFLINE);
	assert.deepEqual(h.counts(), { starts: 1, stops: 0 });
	await other.send('disconnect');
	assert.deepEqual(h.counts(), { starts: 1, stops: 1 });
	assert.deepEqual(h.state.getConnectedUserIds(), []);
	await h.connect('reconnected');
	assert.equal(h.events.at(-1).payload.status, PRESENCE_STATUSES.ONLINE);
	assert.deepEqual(h.counts(), { starts: 2, stops: 1 });
	h.service.stop();
	h.service.stop();
	assert.deepEqual(h.counts(), { starts: 2, stops: 2 });
});

test('does not register unauthenticated sockets', async () => {
	const h = setup();
	const socket = await h.connect('anonymous', null);
	assert.equal(socket.handlers.size, 0);
	assert.deepEqual(socket.rooms, []);
	assert.deepEqual(h.events, []);
	assert.deepEqual(h.counts(), { starts: 0, stops: 0 });
});

for (const status of [PRESENCE_STATUSES.AWAY, PRESENCE_STATUSES.BUSY]) {
	test(`saved ${status} survives the final disconnect and a new server instance`, async () => {
		const storage = new Map();
		const firstServer = setup(storage);
		const first = await firstServer.connect('first');
		await first.send('presence:set', { status });
		assert.equal(storage.get('user'), status);
		await first.send('disconnect');
		assert.equal(firstServer.state.getStatus('user'), PRESENCE_STATUSES.OFFLINE);
		await firstServer.connect('refresh');
		assert.equal(firstServer.state.getStatus('user'), status);
		const nextServer = setup(storage);
		const next = await nextServer.connect('after-restart');
		assert.equal(nextServer.state.getStatus('user'), status);
		await next.send('presence:set', { status: PRESENCE_STATUSES.ONLINE });
		assert.equal(storage.get('user'), PRESENCE_STATUSES.ONLINE);
		nextServer.advance(PRESENCE_IDLE_TIMEOUT_MS);
		nextServer.tick();
		assert.equal(nextServer.state.getStatus('user'), PRESENCE_STATUSES.AWAY);
		assert.equal(storage.get('user'), PRESENCE_STATUSES.ONLINE);
	});
}

test('failed writes leave the current preference unchanged and report failure', async () => {
	const errors = [];
	const storage = new Map([['user', PRESENCE_STATUSES.BUSY]]);
	const h = setup(storage, {
		savePreference: async () => { throw new Error('Unavailable'); },
		onError: (error) => errors.push(error),
	});
	const socket = await h.connect('tab');
	let reply;
	await socket.send('presence:set', { status: PRESENCE_STATUSES.ONLINE }, (result) => { reply = result; });
	assert.deepEqual(reply, { ok: false, status: PRESENCE_STATUSES.BUSY });
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.BUSY);
	assert.equal(storage.get('user'), PRESENCE_STATUSES.BUSY);
	assert.equal(errors.length, 1);
});

test('failed reads do not announce Available or start a presence timer', async () => {
	const h = setup(new Map(), { loadPreference: async () => { throw new Error('Unavailable'); } });
	const socket = await h.connect('tab');
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.OFFLINE);
	assert.equal(h.events.length, 0);
	assert.equal(socket.snapshots[0].event, 'presence:error');
	assert.deepEqual(h.counts(), { starts: 0, stops: 0 });
});

test('a reconnect waits for an in-flight preference save', async () => {
	const storage = new Map();
	let release;
	let started;
	const saving = new Promise((resolve) => { started = resolve; });
	const h = setup(storage, { savePreference: async (userId, status) => {
		started();
		await new Promise((resolve) => { release = resolve; });
		storage.set(userId, status);
	} });
	const first = await h.connect('first');
	const update = first.send('presence:set', { status: PRESENCE_STATUSES.BUSY });
	await saving;
	const disconnect = first.send('disconnect');
	const reconnect = h.connect('next');
	release();
	await Promise.all([update, disconnect, reconnect]);
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.BUSY);
	assert.equal(h.events.at(-1).payload.status, PRESENCE_STATUSES.BUSY);
});
