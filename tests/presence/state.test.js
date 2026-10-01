import {
	PRESENCE_STATUSES,
	PRESENCE_IDLE_TIMEOUT_MS,
} from '../../constants/presence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceState } from '../../services/presence/state.js';

function setup() {
	let time = 0;
	return {
		state: createPresenceState({ now: () => time }),
		advance: (milliseconds) => {
			time += milliseconds;
		},
	};
}

test('connected users become Away at five minutes and Online on activity', () => {
	const { state, advance } = setup();
	assert.equal(state.getStatus('user'), PRESENCE_STATUSES.OFFLINE);
	assert.equal(state.connect('user', 'tab'), PRESENCE_STATUSES.ONLINE);
	advance(PRESENCE_IDLE_TIMEOUT_MS - 1);
	assert.equal(state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
	advance(1);
	assert.equal(state.getStatus('user'), PRESENCE_STATUSES.AWAY);
	assert.equal(state.recordActivity('user', 'tab'), true);
	assert.equal(state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
});

test('activity in any tab keeps the user Online; only the final disconnect is Offline', () => {
	const { state, advance } = setup();
	state.connect('user', 'first');
	state.connect('user', 'second');
	advance(PRESENCE_IDLE_TIMEOUT_MS);
	state.recordActivity('user', 'second');
	assert.equal(state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
	assert.equal(state.disconnect('user', 'second'), PRESENCE_STATUSES.AWAY);
	assert.equal(state.disconnect('user', 'first'), PRESENCE_STATUSES.OFFLINE);
	assert.deepEqual(state.getConnectedUserIds(), []);
});

for (const status of [PRESENCE_STATUSES.AWAY, PRESENCE_STATUSES.BUSY]) {
	test(`manual ${status} survives activity, inactivity and additional connections`, () => {
		const { state, advance } = setup();
		state.connect('user', 'first');
		assert.equal(state.setStatus('user', 'first', status), true);
		state.recordActivity('user', 'first');
		advance(PRESENCE_IDLE_TIMEOUT_MS);
		state.connect('user', 'second');
		assert.equal(state.getStatus('user'), status);
		state.disconnect('user', 'second');
		assert.equal(state.getStatus('user'), status);
		assert.equal(
			state.disconnect('user', 'first'),
			PRESENCE_STATUSES.OFFLINE,
		);
	});
}

test('selecting Online clears manual overrides and restarts automatic activity tracking', () => {
	const { state, advance } = setup();
	state.connect('user', 'tab');
	state.setStatus('user', 'tab', PRESENCE_STATUSES.BUSY);
	advance(PRESENCE_IDLE_TIMEOUT_MS);
	state.setStatus('user', 'tab', PRESENCE_STATUSES.ONLINE);
	assert.equal(state.getStatus('user'), PRESENCE_STATUSES.ONLINE);
	advance(PRESENCE_IDLE_TIMEOUT_MS);
	assert.equal(state.getStatus('user'), PRESENCE_STATUSES.AWAY);
});

test('invalid choices and unknown connections cannot mutate presence', () => {
	const { state } = setup();
	state.connect('user', 'tab');
	for (const status of [PRESENCE_STATUSES.OFFLINE, null, {}, 'BUSY']) {
		assert.equal(state.setStatus('user', 'tab', status), false);
	}
	assert.equal(
		state.setStatus('user', 'unknown', PRESENCE_STATUSES.BUSY),
		false,
	);
	assert.equal(state.recordActivity('user', 'unknown'), false);
	assert.equal(state.recordActivity('unknown', 'tab'), false);
	assert.equal(
		state.setStatus('unknown', 'tab', PRESENCE_STATUSES.BUSY),
		false,
	);
	assert.equal(state.disconnect('user', 'unknown'), PRESENCE_STATUSES.ONLINE);
	assert.equal(state.getStatus('unknown'), PRESENCE_STATUSES.OFFLINE);
});

test('users are isolated and duplicate connections do not reset inactivity', () => {
	const { state, advance } = setup();
	state.connect('first', 'tab-1');
	state.connect('second', 'tab-2');
	state.setStatus('first', 'tab-1', PRESENCE_STATUSES.BUSY);
	advance(PRESENCE_IDLE_TIMEOUT_MS);
	assert.equal(state.connect('second', 'tab-2'), PRESENCE_STATUSES.AWAY);
	assert.equal(state.getStatus('first'), PRESENCE_STATUSES.BUSY);
	state.disconnect('first', 'tab-1');
	assert.equal(state.getStatus('second'), PRESENCE_STATUSES.AWAY);
	assert.equal(state.connect('first', 'new-tab'), PRESENCE_STATUSES.ONLINE);
});
