import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../public/js/root/social.js', import.meta.url), 'utf8');

function setup() {
	const nodes = new Map();
	for (const id of ['socialPanel', 'socialFollowers', 'socialFollowees', 'socialFollowersBody', 'socialFolloweesBody']) {
		const events = new Map();
		const classes = new Set();
		const dots = [];
		nodes.set(id, { events, classes, dataset: { presenceLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }) },
			classList: { contains: (name) => classes.has(name) },
			addEventListener: (name, handler) => events.set(name, handler),
			dots, querySelectorAll: () => dots,
		});
	}
	const events = new Map();
	const emitted = [];
	const socketHandlers = new Map();
	const socket = { connected: true, on: (name, handler) => socketHandlers.set(name, handler),
		emit: (name, payload, callback) => { emitted.push({ name, payload }); if (callback) callback({ ok: true, statuses: [{ userId: 'friend', status: 'busy' }] }); },
	};
	const document = {
		visibilityState: 'visible',
		getElementById: (id) => nodes.get(id),
		querySelectorAll: () => [],
		addEventListener: (name, handler) => events.set(name, handler),
		createElement: () => ({ dataset: {}, setAttribute(name, value) { this[name] = value; } }),
	};
	const window = { io: () => socket };
	const context = vm.createContext({ document, window, console });
	vm.runInContext(source, context);
	return { nodes, document, events, emitted, socketHandlers, context,
		open() { nodes.get('socialPanel').classes.add('show'); nodes.get('socialFollowers').classes.add('show'); },
	};
}

test('watches an open list, applies snapshot and live changes, then unwatches', () => {
	const h = setup();
	const dot = { dataset: { socialPresence: 'friend', status: 'offline' }, setAttribute(name, value) { this[name] = value; } };
	h.nodes.get('socialFollowersBody').dots.push(dot);
	h.open();
	h.nodes.get('socialFollowers').events.get('shown.bs.collapse')();
	assert.equal(h.emitted[0].name, 'presence:watch');
	assert.equal(h.emitted[0].payload.scope, 'social-followers');
	assert.equal(dot.dataset.status, 'busy');
	h.socketHandlers.get('presence:peer:changed')({ userId: 'friend', status: 'away' });
	assert.equal(dot.dataset.status, 'away');
	h.nodes.get('socialFollowers').events.get('hide.bs.collapse')();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
});

test('unwatches when the panel or browser tab is hidden', () => {
	const h = setup();
	h.open();
	h.nodes.get('socialPanel').events.get('hide.bs.offcanvas')();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
	h.document.visibilityState = 'hidden';
	h.events.get('visibilitychange')();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
});

test('status circles include translated tooltips and accessible labels', () => {
	const h = setup();
	const dot = vm.runInContext("createSocialPresenceDot('friend', 'online')", h.context);
	assert.equal(dot.dataset.socialPresence, 'friend');
	assert.equal(dot.dataset.status, 'online');
	assert.equal(dot.dataset.bsTitle, 'Available');
	assert.equal(dot['aria-label'], 'Available');
	assert.ok(dot.className.includes('has-tooltip'));
});
