import { PRESENCE_STATUSES } from '../../constants/presence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceSocketService, PRESENCE_CHECK_INTERVAL_MS } from '../../services/presence/live.js';
import { createPresenceState, PRESENCE_IDLE_TIMEOUT_MS } from '../../services/presence/state.js';

function setup() {
	let time = 0;
	let tick;
	let starts = 0;
	let stops = 0;
	const events = [];
	const state = createPresenceState({ now: () => time });
	const service = createPresenceSocketService({
		to: (room) => ({ emit: (event, payload) => events.push({ room, event, payload }) }),
	}, {
		state,
		schedule: (callback, delay) => {
			assert.equal(delay, PRESENCE_CHECK_INTERVAL_MS);
			tick = callback;
			starts++;
			return { unref() {} };
		},
		cancel: () => { stops++; },
	});
	function connect(id, userId = 'user') {
		const handlers = new Map();
		const snapshots = [];
		const rooms = [];
		service.register({
			id, data: { userId },
			join: (room) => rooms.push(room),
			emit: (event, payload) => snapshots.push({ event, payload }),
			on: (event, handler) => handlers.set(event, handler),
		});
		return { handlers, snapshots, rooms, send: (event, ...args) => handlers.get(event)(...args) };
	}
	return {
		state, service, events, connect,
		advance: (ms) => { time += ms; },
		tick: () => tick(),
		counts: () => ({ starts, stops }),
	};
}

test('sends initial snapshots, publishes inactivity once, and restores Online on activity', () => {
	const h = setup();
	const first = h.connect('first');
	assert.deepEqual(first.rooms, ['presence:user:user']);
	assert.deepEqual(h.events, [{ room: 'presence:user:user', event: 'presence:changed', payload: { status: PRESENCE_STATUSES.ONLINE } }]);
	const second = h.connect('second');
	assert.deepEqual(second.snapshots, [{ event: 'presence:changed', payload: { status: PRESENCE_STATUSES.ONLINE } }]);
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

test('uses authenticated identity and validates manual choices and acknowledgements', () => {
	const h = setup();
	const socket = h.connect('tab');
	h.connect('other-tab', 'other');
	let reply;
	socket.send('presence:set', { userId: 'other', status: PRESENCE_STATUSES.BUSY }, (value) => { reply = value; });
	assert.deepEqual(reply, { ok: true, status: PRESENCE_STATUSES.BUSY });
	assert.equal(h.state.getStatus('other'), PRESENCE_STATUSES.ONLINE);
	assert.equal(h.events.at(-1).room, 'presence:user:user');
	socket.send('presence:activity');
	h.advance(PRESENCE_IDLE_TIMEOUT_MS);
	h.tick();
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.BUSY);
	for (const payload of [null, {}, { status: PRESENCE_STATUSES.OFFLINE }, { status: {} }]) {
		socket.send('presence:set', payload, (value) => { reply = value; });
		assert.deepEqual(reply, { ok: false, status: PRESENCE_STATUSES.BUSY });
	}
	assert.doesNotThrow(() => socket.send('presence:set', { status: PRESENCE_STATUSES.ONLINE }, 'invalid callback'));
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
});

test('disconnects preserve other tabs and stop the timer only after the last user leaves', () => {
	const h = setup();
	const first = h.connect('first');
	const second = h.connect('second');
	const other = h.connect('other', 'other');
	first.send('disconnect');
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
	second.send('disconnect');
	assert.equal(h.state.getStatus('user'), PRESENCE_STATUSES.OFFLINE);
	assert.deepEqual(h.counts(), { starts: 1, stops: 0 });
	other.send('disconnect');
	assert.deepEqual(h.counts(), { starts: 1, stops: 1 });
	assert.deepEqual(h.state.getConnectedUserIds(), []);
	h.connect('reconnected');
	assert.equal(h.events.at(-1).payload.status, PRESENCE_STATUSES.ONLINE);
	assert.deepEqual(h.counts(), { starts: 2, stops: 1 });
	h.service.stop();
	h.service.stop();
	assert.deepEqual(h.counts(), { starts: 2, stops: 2 });
});

test('does not register unauthenticated sockets', () => {
	const h = setup();
	const socket = h.connect('anonymous', null);
	assert.equal(socket.handlers.size, 0);
	assert.deepEqual(socket.rooms, []);
	assert.deepEqual(h.events, []);
	assert.deepEqual(h.counts(), { starts: 0, stops: 0 });
});
