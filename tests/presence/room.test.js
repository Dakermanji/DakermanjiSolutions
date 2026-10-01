import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../public/js/chat/conversation-page/roomPresence.js', import.meta.url), 'utf8');

function setup() {
	const changes = [];
	const tooltipUpdates = [];
	const dots = ['one', 'two'].map((id) => ({
		dataset: { chatMemberPresence: id, status: 'offline' },
		setAttribute(name, value) { this[name] = value; },
	}));
	const panel = {
		hidden: true,
		dataset: { presenceLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }) },
		querySelectorAll: () => dots,
	};
	const events = new Map();
	const document = { visibilityState: 'visible', addEventListener: (event, handler) => events.set(event, handler) };
	const emitted = [];
	const socketHandlers = new Map();
	const socket = { connected: true, on: (name, handler) => socketHandlers.set(name, handler),
		emit: (name, payload, callback) => { emitted.push({ name, payload }); if (callback) callback({ ok: true, statuses: [{ userId: 'one', status: 'online' }, { userId: 'two', status: 'busy' }] }); },
	};
	const window = {
		bootstrap: { Tooltip: { getInstance: () => ({ setContent: (content) => tooltipUpdates.push(content['.tooltip-inner']) }) } },
		AppTooltips: { initIn: () => changes.push('tooltip-init') },
	};
	vm.runInNewContext(source, { window, document, console });
	const controller = window.ChatConversationRoomPresence.createRoomPresenceController({ panel, conversationId: 'room-id' });
	controller.setSocket(socket);
	return { panel, document, events, emitted, socketHandlers, dots, tooltipUpdates, changes, controller };
}

test('watches room members while visible and applies live changes', () => {
	const h = setup();
	h.controller.sync();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
	h.panel.hidden = false;
	h.controller.sync();
	assert.equal(h.emitted.at(-1).name, 'presence:watch');
	assert.equal(h.emitted.at(-1).payload.conversationId, 'room-id');
	assert.equal(h.dots[0].dataset.status, 'online');
	assert.equal(h.dots[1].dataset.status, 'busy');
	assert.equal(h.dots[0]['aria-label'], 'Available');
	assert.equal(h.tooltipUpdates.at(-1), 'Busy');
	h.socketHandlers.get('presence:peer:changed')({ userId: 'one', status: 'away' });
	assert.equal(h.dots[0].dataset.status, 'away');
	h.panel.hidden = true;
	h.controller.sync();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
	h.document.visibilityState = 'hidden';
	h.events.get('visibilitychange')();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
});

test('ignores a snapshot after the member panel closes', () => {
	const h = setup();
	let acknowledge;
	const socket = { connected: true, on() {}, emit(name, payload, callback) { if (name === 'presence:watch') acknowledge = callback; } };
	h.controller.setSocket(socket);
	h.panel.hidden = false;
	h.controller.sync();
	h.panel.hidden = true;
	h.controller.sync();
	acknowledge({ ok: true, statuses: [{ userId: 'one', status: 'online' }] });
	assert.equal(h.dots[0].dataset.status, 'offline');
});
