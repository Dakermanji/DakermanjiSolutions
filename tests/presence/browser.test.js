import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/js/root/presence.js', import.meta.url), 'utf8');

function setup({ available = true } = {}) {
	let time = 0;
	const handlers = new Map();
	const documentHandlers = new Map();
	const windowHandlers = new Map();
	const reports = [];
	const socket = {
		connected: false,
		on: (event, handler) => handlers.set(event, handler),
		emit: (event) => reports.push(event),
	};
	const document = {
		visibilityState: 'visible',
		addEventListener: (event, handler) => documentHandlers.set(event, handler),
	};
	const window = {
		io: available ? () => socket : undefined,
		addEventListener: (event, handler) => windowHandlers.set(event, handler),
	};
	vm.runInNewContext(source, { window, document, performance: { now: () => time } });
	return {
		socket, document, reports, documentHandlers,
		connect() { socket.connected = true; handlers.get('connect')(); },
		advance(ms) { time += ms; },
		activity(event = 'pointermove') { documentHandlers.get(event)(); },
		focus() { windowHandlers.get('focus')(); },
	};
}

test('reports on connection and throttles activity across input types', () => {
	const h = setup();
	h.connect();
	assert.deepEqual(h.reports, ['presence:activity']);
	for (const event of ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'scroll']) h.activity(event);
	h.advance(29_999);
	h.activity();
	assert.equal(h.reports.length, 1);
	h.advance(1);
	h.activity('keydown');
	assert.equal(h.reports.length, 2);
	// Time passing alone produces no activity reports.
	h.advance(300_000);
	assert.equal(h.reports.length, 2);
	h.activity('touchstart');
	assert.equal(h.reports.length, 3);
});

test('ignores hidden and disconnected activity and resumes on reconnect', () => {
	const h = setup();
	h.activity();
	assert.equal(h.reports.length, 0);
	h.document.visibilityState = 'hidden';
	h.connect();
	h.activity();
	assert.equal(h.reports.length, 0);
	h.document.visibilityState = 'visible';
	h.activity('visibilitychange');
	assert.equal(h.reports.length, 1);
	h.socket.connected = false;
	h.advance(30_000);
	h.activity();
	assert.equal(h.reports.length, 1);
	h.connect();
	assert.equal(h.reports.length, 2);
	h.advance(30_000);
	h.focus();
	assert.equal(h.reports.length, 3);
});

test('does nothing when Socket.IO is unavailable', () => {
	const h = setup({ available: false });
	assert.equal(h.documentHandlers.size, 0);
	assert.deepEqual(h.reports, []);
});
