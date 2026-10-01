import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../public/js/chat/conversation-page/friendPresence.js', import.meta.url), 'utf8');

function setup() {
	const handlers = new Map();
	const documentEvents = new Map();
	const emitted = [];
	const tooltips = [];
	const dot = {
		dataset: {
			chatConversationFriendPresence: 'friend',
			presenceLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }),
			status: 'offline',
		},
		setAttribute(name, value) { this[name] = value; },
	};
	const document = { visibilityState: 'visible', addEventListener: (name, handler) => documentEvents.set(name, handler) };
	const window = { bootstrap: { Tooltip: { getInstance: () => ({ setContent: (content) => tooltips.push(content['.tooltip-inner']) }) } } };
	const socket = {
		connected: true,
		on: (name, handler) => handlers.set(name, handler),
		emit: (name, payload, callback) => emitted.push({ name, payload, callback }),
	};
	vm.runInNewContext(source, { window, document });
	const controller = window.ChatConversationFriendPresence.createFriendPresenceController({ dot, conversationId: 'conversation' });
	controller.setSocket(socket);
	return { controller, document, documentEvents, dot, emitted, handlers, socket, tooltips };
}

test('watches only the open friend and updates the avatar status and tooltip', () => {
	const h = setup();
	assert.equal(h.emitted[0].name, 'presence:watch');
	assert.equal(h.emitted[0].payload.scope, 'chat-friend');
	assert.equal(h.emitted[0].payload.conversationId, 'conversation');
	h.emitted[0].callback({ ok: true, statuses: [{ userId: 'friend', status: 'online' }] });
	assert.equal(h.dot.dataset.status, 'online');
	assert.equal(h.dot['aria-label'], 'Available');
	h.handlers.get('presence:peer:changed')({ userId: 'someone-else', status: 'busy' });
	assert.equal(h.dot.dataset.status, 'online');
	h.handlers.get('presence:peer:changed')({ userId: 'friend', status: 'away' });
	assert.equal(h.dot.dataset.status, 'away');
	assert.equal(h.tooltips.at(-1), 'Away');
});

test('stops watching while hidden and ignores late snapshots', () => {
	const h = setup();
	h.document.visibilityState = 'hidden';
	h.documentEvents.get('visibilitychange')();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
	h.emitted[0].callback({ ok: true, statuses: [{ userId: 'friend', status: 'online' }] });
	assert.equal(h.dot.dataset.status, 'offline');
	h.document.visibilityState = 'visible';
	h.documentEvents.get('visibilitychange')();
	assert.equal(h.emitted.at(-1).name, 'presence:watch');
	h.emitted.at(-1).callback({ ok: true, statuses: [{ userId: 'friend', status: 'busy' }] });
	assert.equal(h.dot.dataset.status, 'busy');
});
