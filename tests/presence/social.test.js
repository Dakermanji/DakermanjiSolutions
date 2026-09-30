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
		nodes.set(id, { events, classes, dataset: { presenceLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }) },
			classList: { contains: (name) => classes.has(name) },
			addEventListener: (name, handler) => events.set(name, handler),
		});
	}
	const timers = new Map();
	const events = new Map();
	const calls = [];
	let timerId = 0;
	const document = {
		visibilityState: 'visible',
		getElementById: (id) => nodes.get(id),
		querySelectorAll: () => [],
		addEventListener: (name, handler) => events.set(name, handler),
		createElement: () => ({ dataset: {}, setAttribute(name, value) { this[name] = value; } }),
	};
	const window = {
		setInterval: (callback, delay) => { assert.equal(delay, 60_000); timers.set(++timerId, callback); return timerId; },
		clearInterval: (id) => timers.delete(id),
	};
	const context = vm.createContext({ document, window, console, calls });
	vm.runInContext(source, context);
	vm.runInContext("loadFollowers = async () => { calls.push('followers'); }; loadFollowees = async () => { calls.push('followees'); };", context);
	return { nodes, timers, document, events, calls, context,
		open() { nodes.get('socialPanel').classes.add('show'); nodes.get('socialFollowers').classes.add('show'); },
		refresh: () => vm.runInContext('refreshSocialPresence()', context),
	};
}

test('requests presence only for a visible, open Followers or Following section', async () => {
	const h = setup();
	await h.refresh();
	assert.deepEqual(h.calls, []);
	h.open();
	await h.refresh();
	assert.deepEqual(h.calls, ['followers']);
	h.document.visibilityState = 'hidden';
	await h.refresh();
	assert.equal(h.calls.length, 1);
	h.document.visibilityState = 'visible';
	h.nodes.get('socialFollowers').classes.delete('show');
	h.nodes.get('socialFollowees').classes.add('show');
	await h.refresh();
	assert.deepEqual(h.calls, ['followers', 'followees']);
	h.nodes.get('socialPanel').classes.delete('show');
	await h.refresh();
	assert.equal(h.calls.length, 2);
});

test('starts one minute polling and stops when the panel, section, or tab is hidden', () => {
	const h = setup();
	h.open();
	const shown = h.nodes.get('socialFollowers').events.get('shown.bs.collapse');
	shown(); shown();
	assert.equal(h.timers.size, 1);
	h.nodes.get('socialFollowers').events.get('hide.bs.collapse')();
	assert.equal(h.timers.size, 0);
	shown();
	h.nodes.get('socialPanel').events.get('hide.bs.offcanvas')();
	assert.equal(h.timers.size, 0);
	shown();
	h.document.visibilityState = 'hidden';
	h.events.get('visibilitychange')();
	assert.equal(h.timers.size, 0);
});

test('status circles include translated tooltips and accessible labels', () => {
	const h = setup();
	const dot = vm.runInContext("createSocialPresenceDot('online')", h.context);
	assert.equal(dot.dataset.status, 'online');
	assert.equal(dot.dataset.bsTitle, 'Available');
	assert.equal(dot['aria-label'], 'Available');
	assert.ok(dot.className.includes('has-tooltip'));
});
