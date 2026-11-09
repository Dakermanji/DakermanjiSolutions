import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { isValidUsername, parseIdentifier } from '../../middlewares/validators/common.js';

const socialScripts = ['state', 'feedback', 'render', 'actions', 'sections', 'live', 'presence', 'follow-request', 'main'];
const sources = socialScripts.map((name) => readFileSync(
	new URL(`../../public/js/social/${name}.js`, import.meta.url), 'utf8',
));

function setup({ withFollowRequest = false } = {}) {
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
	const identifierEvents = new Map();
	const identifierClasses = new Set();
	const identifier = { value: '', classList: {
		add: (name) => identifierClasses.add(name), remove: (name) => identifierClasses.delete(name),
		contains: (name) => identifierClasses.has(name),
	}, addEventListener: (name, handler) => identifierEvents.set(name, handler),
		setAttribute(name, value) { this[name] = value; },
		removeAttribute(name) { delete this[name]; }, focus() { this.focused = true; },
	};
	const formEvents = new Map();
	const form = { elements: { namedItem: () => identifier },
		addEventListener: (name, handler) => formEvents.set(name, handler) };
	const error = { hidden: true };
	const document = {
		visibilityState: 'visible',
		getElementById: (id) => id === 'follow-request-error' ? error : nodes.get(id),
		querySelector: () => withFollowRequest ? form : null,
		querySelectorAll: () => [],
		addEventListener: (name, handler) => events.set(name, handler),
		createElement: () => ({ dataset: {}, setAttribute(name, value) { this[name] = value; } }),
	};
	const window = { io: () => socket };
	const context = vm.createContext({ document, window, console });
	for (const source of sources) vm.runInContext(source, context);
	return { nodes, document, events, emitted, socketHandlers, context,
		identifier, identifierEvents, formEvents, error,
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

test('validates follow request identifiers without browser feedback', () => {
	const h = setup({ withFollowRequest: true });
	const submit = () => { const event = { prevented: false, preventDefault() { this.prevented = true; } };
		h.formEvents.get('submit')(event); return event.prevented; };
	assert.equal(submit(), true);
	assert.equal(h.error.hidden, false);
	assert.equal(h.identifier['aria-invalid'], 'true');
	h.identifier.value = 'alice';
	h.identifierEvents.get('input')();
	assert.equal(h.error.hidden, true);
	assert.equal(submit(), false);
	for (const value of ['123', 'a12', '1a_2', '123a']) {
		h.identifier.value = value;
		assert.equal(submit(), true, value);
	}
	for (const value of ['12ab', 'a1b', '123alice']) {
		h.identifier.value = value;
		assert.equal(submit(), false, value);
	}
	h.identifier.value = 'bad@';
	assert.equal(submit(), true);
	for (const value of ['alice@site', 'a..b@example.com', 'alice@-site.com',
		'alice@site..com', 'alice@site.c', 'alice,tag@example.com']) {
		h.identifier.value = value;
		assert.equal(submit(), true, value);
	}
	for (const value of ['alice@example.com', 'alice+tag@example.com', 'ü@example.com',
		'123@example.com', '"a b"@example.com', '"a@b"@example.com']) {
		h.identifier.value = value;
		assert.equal(submit(), false, value);
	}
});

test('server requires two letters in new usernames while retaining legacy sign-in parsing', () => {
	for (const value of ['123', 'a12', '1a_2', '123a']) {
		assert.equal(isValidUsername(value), false, value);
		assert.equal(parseIdentifier(value), null, value);
		assert.equal(parseIdentifier(value, { allowLegacyUsername: true })?.identifierType, 'username', value);
	}
	for (const value of ['12ab', 'a1b', '123alice']) {
		assert.equal(isValidUsername(value), true, value);
		assert.equal(parseIdentifier(value)?.identifierType, 'username', value);
	}
	assert.equal(parseIdentifier('123alice@example.com')?.identifierType, 'email');
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
