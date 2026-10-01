import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceWatchService } from '../../services/presence/watch.js';

function setup() {
	const audiences = new Map([['viewer', ['friend']]]);
	const watches = createPresenceWatchService({
		resolveAudience: async (viewer, scope) => scope === 'chat-friends' ? audiences.get(viewer) : null,
		state: { getStatus: (id) => id === 'friend' ? 'online' : 'offline' },
	});
	const handlers = new Map();
	const emitted = [];
	const socket = {
		id: 'socket', data: { userId: 'viewer' }, connected: true,
		on: (event, handler) => handlers.set(event, handler),
		emit: (event, payload) => emitted.push({ event, payload }),
	};
	watches.register(socket);
	return { audiences, watches, handlers, emitted, socket };
}

test('authorized watcher receives a snapshot and direct changes', async () => {
	const h = setup();
	let reply;
	await h.handlers.get('presence:watch')({ scope: 'chat-friends' }, (result) => { reply = result; });
	assert.deepEqual(reply, { ok: true, statuses: [{ userId: 'friend', status: 'online' }] });
	await h.watches.publish('friend', 'busy');
	assert.deepEqual(h.emitted, [{ event: 'presence:peer:changed', payload: { userId: 'friend', status: 'busy' } }]);
	h.handlers.get('presence:unwatch')();
	await h.watches.publish('friend', 'away');
	assert.equal(h.emitted.length, 1);
});

test('rechecks access before every change and rejects unknown scopes', async () => {
	const h = setup();
	let reply;
	await h.handlers.get('presence:watch')({ scope: 'invalid' }, (result) => { reply = result; });
	assert.deepEqual(reply, { ok: false });
	await h.handlers.get('presence:watch')({ scope: 'chat-friends' }, () => {});
	h.audiences.set('viewer', []);
	await h.watches.publish('friend', 'busy');
	assert.deepEqual(h.emitted, []);
	h.audiences.set('viewer', ['friend']);
	await h.watches.publish('friend', 'online');
	assert.deepEqual(h.emitted, []);
});

test('disconnect removes the watcher', async () => {
	const h = setup();
	await h.handlers.get('presence:watch')({ scope: 'chat-friends' }, () => {});
	h.socket.connected = false;
	h.handlers.get('disconnect')();
	await h.watches.publish('friend', 'busy');
	assert.deepEqual(h.emitted, []);
});
