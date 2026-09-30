import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PRESENCE_STATUSES } from '../../constants/presence.js';

const source = readFileSync(new URL('../../public/js/root/presence.js', import.meta.url), 'utf8');

function setup({ available = true } = {}) {
	let time = 0;
	const handlers = new Map();
	const documentHandlers = new Map();
	const windowHandlers = new Map();
	const reports = [];
	const changes = [];
	const tooltipUpdates = [];
	const choices = [PRESENCE_STATUSES.ONLINE, PRESENCE_STATUSES.AWAY, PRESENCE_STATUSES.BUSY].map((status) => ({
		dataset: { presenceChoice: status }, disabled: true,
		setAttribute(name, value) { this[name] = value; },
		addEventListener(event, handler) { this.click = handler; },
	}));
	const dot = { dataset: { status: PRESENCE_STATUSES.OFFLINE } };
	const selector = {
		dataset: { offlineStatus: PRESENCE_STATUSES.OFFLINE, statusLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }) },
		setAttribute(name, value) { this[name] = value; },
		addEventListener() {},
	};
	const feedback = { textContent: '', dataset: { error: 'Failed', connecting: 'Connecting' } };
	const socket = {
		connected: false,
		on: (event, handler) => handlers.set(event, handler),
		emit: (event) => reports.push(event),
		timeout: (ms) => {
			assert.equal(ms, 5000);
			return { emit: (event, payload, callback) => changes.push({ event, payload, callback }) };
		},
	};
	const document = {
		querySelector: (query) => query === '[data-presence-trigger]' ? selector : query === '[data-presence-dot]' ? dot : feedback,
		querySelectorAll: () => choices,
		visibilityState: 'visible',
		addEventListener: (event, handler) => documentHandlers.set(event, handler),
	};
	const window = {
		bootstrap: { Tooltip: { getInstance: () => ({ setContent: (content) => tooltipUpdates.push(content['.tooltip-inner']) }) } },
		io: available ? () => socket : undefined,
		addEventListener: (event, handler) => windowHandlers.set(event, handler),
	};
	vm.runInNewContext(source, { window, document, performance: { now: () => time } });
	return {
		socket, document, reports, documentHandlers, selector, feedback, changes, choices, dot, tooltipUpdates,
		receive(event, payload) { handlers.get(event)(payload); },
		choose(status) { choices.find((choice) => choice.dataset.presenceChoice === status).click(); },
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

test('selector follows server status and sends manual choices with acknowledgement', () => {
	const h = setup();
	h.connect();
	assert.equal(h.choices[0].disabled, true);
	h.receive('presence:changed', { status: PRESENCE_STATUSES.ONLINE });
	assert.equal(h.choices[0].disabled, false);
	assert.equal(h.dot.dataset.status, PRESENCE_STATUSES.ONLINE);
	assert.equal(h.selector['aria-label'], 'Available');
	assert.equal(h.selector['data-bs-title'], 'Available');
	assert.equal(h.tooltipUpdates.at(-1), 'Available');
	assert.equal(h.choices.some((choice) => choice.dataset.presenceChoice === PRESENCE_STATUSES.OFFLINE), false);
	h.choose(PRESENCE_STATUSES.BUSY);
	assert.equal(h.choices[0].disabled, true);
	assert.equal(h.changes[0].event, 'presence:set');
	assert.equal(h.changes[0].payload.status, PRESENCE_STATUSES.BUSY);
	h.changes[0].callback(null, { ok: true, status: PRESENCE_STATUSES.BUSY });
	assert.equal(h.choices[0].disabled, false);
	assert.equal(h.dot.dataset.status, PRESENCE_STATUSES.BUSY);
	assert.equal(h.tooltipUpdates.at(-1), 'Busy');
	assert.equal(h.choices.find((choice) => choice.dataset.presenceChoice === PRESENCE_STATUSES.BUSY)['aria-pressed'], 'true');
	h.receive('presence:changed', { status: PRESENCE_STATUSES.AWAY });
	assert.equal(h.dot.dataset.status, PRESENCE_STATUSES.AWAY);
});

test('failed choices restore confirmed status and stale acknowledgements cannot undo disconnects', () => {
	const h = setup();
	h.connect();
	h.receive('presence:changed', { status: PRESENCE_STATUSES.ONLINE });
	h.choose(PRESENCE_STATUSES.BUSY);
	h.changes[0].callback(new Error('timeout'));
	assert.equal(h.dot.dataset.status, PRESENCE_STATUSES.ONLINE);
	assert.equal(h.feedback.textContent, 'Failed');
	h.choose(PRESENCE_STATUSES.AWAY);
	h.socket.connected = false;
	h.receive('disconnect');
	assert.equal(h.dot.dataset.status, PRESENCE_STATUSES.OFFLINE);
	assert.equal(h.choices[0].disabled, true);
	h.connect();
	h.changes[1].callback(null, { ok: true, status: PRESENCE_STATUSES.AWAY });
	assert.equal(h.dot.dataset.status, PRESENCE_STATUSES.OFFLINE);
	assert.equal(h.choices[0].disabled, true);
	h.receive('presence:changed', { status: PRESENCE_STATUSES.ONLINE });
	assert.equal(h.choices[0].disabled, false);
});
