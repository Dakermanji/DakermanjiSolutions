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
		dataset: { presenceUrl: '/chat/rooms/members/presence', presenceLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }) },
		querySelectorAll: () => dots,
	};
	const events = new Map();
	const document = { visibilityState: 'visible', addEventListener: (event, handler) => events.set(event, handler) };
	const timers = new Map();
	let timerId = 0;
	const requests = [];
	const window = {
		setInterval: (callback, interval) => { assert.equal(interval, 60_000); timers.set(++timerId, callback); return timerId; },
		clearInterval: (id) => timers.delete(id),
		bootstrap: { Tooltip: { getInstance: () => ({ setContent: (content) => tooltipUpdates.push(content['.tooltip-inner']) }) } },
		AppTooltips: { initIn: () => changes.push('tooltip-init') },
	};
	const fetch = async (url, options) => {
		requests.push({ url, options });
		return { ok: true, json: async () => ({ ok: true, members: [{ id: 'one', status: 'online' }, { id: 'two', status: 'busy' }] }) };
	};
	vm.runInNewContext(source, { window, document, fetch, AbortController, console, Map, encodeURIComponent });
	const controller = window.ChatConversationRoomPresence.createRoomPresenceController({ panel, conversationId: 'room-id' });
	return { panel, document, events, timers, requests, dots, tooltipUpdates, changes, controller };
}

test('opens with a request and refreshes every minute while visible', async () => {
	const h = setup();
	h.controller.sync();
	assert.equal(h.requests.length, 0);
	h.panel.hidden = false;
	h.controller.sync();
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(h.requests.length, 1);
	assert.ok(h.requests[0].url.includes('conversationId=room-id'));
	assert.equal(h.dots[0].dataset.status, 'online');
	assert.equal(h.dots[1].dataset.status, 'busy');
	assert.equal(h.dots[0]['aria-label'], 'Available');
	assert.equal(h.tooltipUpdates.at(-1), 'Busy');
	assert.equal(h.timers.size, 1);
	await [...h.timers.values()][0]();
	assert.equal(h.requests.length, 2);
	h.panel.hidden = true;
	h.controller.sync();
	assert.equal(h.timers.size, 0);
	h.document.visibilityState = 'hidden';
	h.events.get('visibilitychange')();
	assert.equal(h.timers.size, 0);
});

test('ignores a response after the member panel closes', async () => {
	const h = setup();
	let deliver;
	const pending = new Promise((resolve) => { deliver = resolve; });
	// Intercept one queued response by using a separate fixture with delayed fetch.
	const document = { visibilityState: 'visible', addEventListener() {} };
	const dot = { dataset: { chatMemberPresence: 'one', status: 'offline' }, setAttribute() {} };
	const panel = { hidden: false, dataset: h.panel.dataset, querySelectorAll: () => [dot] };
	const fakeWindow = { setInterval: () => 1, clearInterval() {}, AppTooltips: { initIn() {} } };
	vm.runInNewContext(source, { window: fakeWindow, document,
		fetch: async () => ({ ok: true, json: () => pending }), AbortController, console, Map, encodeURIComponent });
	const controller = fakeWindow.ChatConversationRoomPresence.createRoomPresenceController({ panel, conversationId: 'room-id' });
	controller.sync();
	panel.hidden = true;
	controller.sync();
	deliver({ ok: true, members: [{ id: 'one', status: 'online' }] });
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(dot.dataset.status, 'offline');
});
